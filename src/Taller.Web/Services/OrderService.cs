using System.Data;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Taller.Web.Contracts;
using Taller.Web.Data;
using Taller.Web.Domain;
namespace Taller.Web.Services;

public class OrderService(TallerDbContext db, IConfiguration config)
{
    public IQueryable<WorkOrder> Visible(ClaimsPrincipal user)
    {
        var orders = db.Orders.AsQueryable();
        if (!user.IsInRole(Roles.Admin) && !user.IsInRole(Roles.Reception))
        {
            var id = user.FindFirstValue(ClaimTypes.NameIdentifier);
            orders = orders.Where(o => o.Assignments.Any(a => a.MechanicId == id && a.EndedAt == null));
        }
        return orders;
    }
    public async Task<WorkOrder> Load(int id, ClaimsPrincipal user) => await Visible(user)
        .Include(o => o.Vehicle).ThenInclude(v => v.Customer).Include(o => o.Quotes).ThenInclude(q => q.Lines)
        .Include(o => o.Repairs).Include(o => o.Tests).Include(o => o.Payments).Include(o => o.Assignments)
        .AsSplitQuery().SingleOrDefaultAsync(o => o.Id == id) ?? throw new BusinessException("Orden no encontrada.", 404);

    public async Task<object> Change(int id, ClaimsPrincipal user, string action, Func<WorkOrder, string, Task<object>> change, bool allowDelivered = false)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var order = await Load(id, user);
        Rules.Require(allowDelivered || order.Status != OrderStatus.Entregado, "La orden entregada se conserva como historial.");
        var actor = user.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var result = await change(order, actor);
        order.UpdatedAt = DateTimeOffset.UtcNow;
        db.Audit.Add(new AuditEntry { ActorId = actor, Action = action, Resource = "Orden", ResourceId = order.Id });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return result;
    }
    public void SetStatus(WorkOrder order, OrderStatus status, string actor, string? comment)
    {
        db.StatusHistory.Add(new StatusHistory { WorkOrderId = order.Id, AuthorId = actor, Previous = order.Status, Current = status, Comment = comment });
        order.Status = status;
    }
    public async Task Transition(WorkOrder order, TransitionRequest r, string actor)
    {
        Rules.Require(Rules.Next(order.Status).Contains(r.Status), "Ese cambio de estado no está permitido.");
        if (r.Status == OrderStatus.EnEspera)
            Rules.Require(order.Status == OrderStatus.Ingresado, "Solo se puede esperar desde el estado de ingreso.");
        if (r.Status == OrderStatus.Diagnostico)
            Rules.Require(order.Status == OrderStatus.Ingresado || order.Status == OrderStatus.EnEspera, "La orden debe estar en ingreso o en espera para diagnosticar.");
        if (r.Status == OrderStatus.Cotizacion)
        {
            Rules.Require(await db.Diagnoses.AnyAsync(d => d.WorkOrderId == order.Id), "Registra el diagnóstico antes de cotizar.");
            Rules.Require(order.Status == OrderStatus.Diagnostico, "La orden debe estar en diagnóstico para cotizar.");
        }
        if (r.Status == OrderStatus.Autorizacion)
        {
            var latest = Rules.LatestQuote(order);
            Rules.Require(latest?.Status == QuoteStatus.Pendiente && latest.ExpiresAt > DateTimeOffset.UtcNow, "Se necesita una cotización vigente pendiente.");
            Rules.Require(order.Status == OrderStatus.Cotizacion, "La orden debe estar en cotización.");
        }
        if (r.Status == OrderStatus.EnReparacion)
        {
            Rules.Require(order.Status == OrderStatus.Autorizacion || order.Status == OrderStatus.ListoParaEntrega || order.Status == OrderStatus.Pruebas, "La orden debe estar en autorización, pruebas o lista para entrega.");
            if (order.Status == OrderStatus.Autorizacion)
            {
                var latest = Rules.LatestQuote(order);
                Rules.Require(latest?.Status == QuoteStatus.Autorizada, "La última versión de la cotización debe estar autorizada.");
            }
            else if (order.Status == OrderStatus.ListoParaEntrega)
            {
                Rules.Require(order.Repairs.All(x => x.CompletedAt != null), "Todos los trabajos deben estar terminados antes de volver a reparación.");
            }
        }
        if (r.Status == OrderStatus.Pruebas)
        {
            Rules.Require(order.Status == OrderStatus.EnReparacion, "La orden debe estar en reparación.");
            Rules.Require(order.Repairs.Count > 0 && order.Repairs.All(x => x.CompletedAt != null), "Finaliza todos los trabajos antes de iniciar las pruebas.");
            var latest = Rules.LatestQuote(order);
            Rules.Require(latest!.Lines.All(l => order.Repairs.Any(rp => rp.QuoteLineId == l.Id && rp.CompletedAt != null)), "Cada concepto autorizado requiere un trabajo terminado.");
        }
        if (r.Status is OrderStatus.Reparado or OrderStatus.ListoParaEntrega) RequireSuccessfulTest(order);
        SetStatus(order, r.Status, actor, r.Comment);
    }
    public static void RequireSuccessfulTest(WorkOrder order)
    {
        var test = order.Tests.OrderByDescending(t => t.CreatedAt).ThenByDescending(t => t.Id).FirstOrDefault();
        var lastRepair = order.Repairs.Select(r => r.CompletedAt).DefaultIfEmpty().Max();
        Rules.Require(test?.Result == TestResult.Satisfactorio && lastRepair != null && test.CreatedAt >= lastRepair, "Registra una prueba satisfactoria después de finalizar los trabajos.");
    }
    public Task Deliver(WorkOrder order, DeliveryRequest r, string actor)
    {
        Rules.Require(order.Status == OrderStatus.ListoParaEntrega, "La orden debe estar lista para entrega.");
        Rules.Require(Rules.LatestQuote(order)?.Status == QuoteStatus.Autorizada, "La cotización actual debe estar autorizada.");
        RequireSuccessfulTest(order);
        Rules.Require(r.CustomerAccepted, "Registra la conformidad del cliente para entregar.");
        Rules.Require(r.ExitMileage >= Math.Max(order.EntryMileage, order.Vehicle.Mileage), "El kilometraje de salida no puede ser menor al registrado.");
        Rules.Require(!config.GetValue<bool>("Taller:ExigirPagoParaEntrega") || Rules.Balance(order) <= 0, "La orden tiene saldo pendiente.");
        db.Deliveries.Add(new Delivery { WorkOrderId = order.Id, AuthorId = actor, ExitMileage = r.ExitMileage, ReceivedBy = r.ReceivedBy, CustomerAccepted = r.CustomerAccepted, Notes = r.Notes });
        order.DeliveredAt = DateTimeOffset.UtcNow;
        order.Vehicle.Mileage = r.ExitMileage;
        SetStatus(order, OrderStatus.Entregado, actor, "Entrega con conformidad del cliente");
        return Task.CompletedTask;
    }
}
