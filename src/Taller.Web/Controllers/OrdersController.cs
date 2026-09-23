using System.Data;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Taller.Web.Contracts;
using Taller.Web.Data;
using Taller.Web.Domain;
using Taller.Web.Services;
namespace Taller.Web.Controllers;

[ApiController, Authorize, Route("api/orders")]
public class OrdersController(TallerDbContext db, OrderService workflow, TrackingService tracking, UserManager<StaffUser> users, IConfiguration config) : ControllerBase
{
    [HttpGet]
    public async Task<object> List() => await workflow.Visible(User).AsNoTracking().OrderByDescending(o => o.Id)
        .Select(o => new { o.Id, o.Folio, o.Status, o.Priority, o.EnteredAt, o.EstimatedDelivery, o.UpdatedAt, o.Reason,
            vehicle = o.Vehicle.Brand + " " + o.Vehicle.Model, o.Vehicle.Plate, customer = o.Vehicle.Customer.Name }).ToListAsync();

    [HttpGet("{id:int}")]
    public async Task<object> Detail(int id)
    {
        var o = await workflow.Load(id, User);
        return new
        {
            o.Id, o.Folio, o.Status, o.Priority, o.EnteredAt, o.EstimatedDelivery, o.DeliveredAt, o.UpdatedAt, o.EntryMileage, o.Reason,
            vehicle = new { o.Vehicle.Id, o.Vehicle.Brand, o.Vehicle.Model, o.Vehicle.Year, o.Vehicle.Plate, o.Vehicle.Vin },
            customer = new { o.Vehicle.Customer.Name, o.Vehicle.Customer.Phone },
            nextStatuses = Rules.Next(o.Status), balance = Rules.Balance(o), paid = o.Payments.Sum(p => p.Amount),
            reception = await db.Receptions.Where(r => r.WorkOrderId == id).Select(r => new { r.FuelPercent, r.KeyCount, r.SpareTire, r.Jack, r.Tools, r.Belongings, r.ExistingDamage, checklist = r.Checklist.Select(c => new { c.Item, c.Condition, c.Notes }) }).SingleAsync(),
            assignments = await db.Assignments.Where(a => a.WorkOrderId == id).Select(a => new { a.Id, a.MechanicId, mechanic = a.Mechanic.FullName, a.CreatedAt, a.EndedAt }).ToListAsync(),
            history = await db.StatusHistory.Where(h => h.WorkOrderId == id).OrderByDescending(h => h.Id).Select(h => new { h.Previous, h.Current, h.Comment, h.CreatedAt, author = h.Author.FullName }).ToListAsync(),
            diagnoses = await db.Diagnoses.Where(d => d.WorkOrderId == id).OrderByDescending(d => d.Id).Select(d => new { d.Id, d.Description, d.Cause, d.Recommendation, d.CreatedAt, author = d.Author.FullName, faults = d.Faults.Select(f => new { f.Description, f.Priority }) }).ToListAsync(),
            quotes = await db.Quotes.Where(q => q.WorkOrderId == id).OrderByDescending(q => q.Version).Select(q => new
            {
                q.Id, q.Version, q.Status, q.Subtotal, q.Discount, q.TaxPercent, q.Tax, q.Total, q.ExpiresAt,
                lines = q.Lines.Select(l => new { l.Id, l.Type, l.Description, l.Quantity, l.UnitPrice, l.Total }),
                authorization = q.Authorization == null ? null : new { q.Authorization.Approved, q.Authorization.ConsentEvidence, q.Authorization.CreatedAt, recordedBy = q.Authorization.RecordedBy.FullName }
            }).ToListAsync(),
            repairs = await db.Repairs.Where(r => r.WorkOrderId == id).Select(r => new { r.Id, r.QuoteLineId, r.Description, r.CreatedAt, r.CompletedAt, author = r.Author.FullName }).ToListAsync(),
            tests = await db.Tests.Where(t => t.WorkOrderId == id).OrderByDescending(t => t.Id).Select(t => new { t.Id, t.Type, t.Result, t.Notes, t.CreatedAt }).ToListAsync(),
            payments = o.Payments.Select(p => new { p.Id, p.Amount, p.Method, p.Reference, p.CreatedAt }),
            updates = await db.Updates.Where(u => u.WorkOrderId == id).OrderByDescending(u => u.Id).Select(u => new { u.Id, u.Title, u.Message, u.VisibleToCustomer, u.CreatedAt }).ToListAsync(),
            evidence = await db.Evidence.Where(e => e.WorkOrderId == id).Select(e => new { e.Id, e.Description, e.Stage, e.VisibleToCustomer, e.CreatedAt }).ToListAsync(),
            delivery = await db.Deliveries.Where(d => d.WorkOrderId == id).Select(d => new { d.ExitMileage, d.ReceivedBy, d.CustomerAccepted, d.Notes, d.CreatedAt }).SingleOrDefaultAsync(),
            tracking = await db.TrackingAccesses.Where(a => a.WorkOrderId == id && !a.Revoked).Select(a => new { a.ExpiresAt, a.LastAccess }).SingleOrDefaultAsync()
        };
    }
    [HttpPost, Authorize(Roles = Roles.Office)]
    public async Task<object> Receive(ReceiveRequest r)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var v = await db.Vehicles.Include(v => v.Customer).SingleOrDefaultAsync(v => v.Id == r.VehicleId);
        Rules.Require(v is { Active: true } && v.Customer.Active, "Selecciona un vehículo y cliente activos.");
        Rules.Require(r.EntryMileage >= v!.Mileage, "El kilometraje no puede ser menor al último registrado.");
        Rules.Require(!await db.Orders.AnyAsync(o => o.VehicleId == r.VehicleId && o.Status != OrderStatus.Entregado), "Este vehículo ya tiene una orden abierta.");
        Rules.Require(r.EstimatedDelivery is null || r.EstimatedDelivery > DateTimeOffset.UtcNow, "La entrega estimada debe ser futura.");
        Rules.Require(r.Checklist.Select(c => c.Item.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).Count() == r.Checklist.Count, "El checklist contiene elementos duplicados.");
        if (r.AppointmentId is { } aid)
        {
            var appointment = await db.Appointments.FindAsync(aid);
            Rules.Require(appointment != null && appointment.VehicleId == r.VehicleId && appointment.Status is AppointmentStatus.Pendiente or AppointmentStatus.Confirmada or AppointmentStatus.EnEspera, "La cita no corresponde al vehículo o ya está cerrada.");
            appointment!.Status = AppointmentStatus.Atendida;
        }
        var actor = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var order = new WorkOrder { Folio = "OT-" + DateTime.UtcNow.ToString("yyMMdd") + "-" + Guid.NewGuid().ToString("N")[..10].ToUpperInvariant(),
            VehicleId = r.VehicleId, AppointmentId = r.AppointmentId, EntryMileage = r.EntryMileage, Reason = r.Reason, Priority = r.Priority, EstimatedDelivery = r.EstimatedDelivery, ReceivedById = actor, Status = OrderStatus.Ingresado };
        db.Orders.Add(order); v.Mileage = r.EntryMileage;
        await db.SaveChangesAsync();
        db.Receptions.Add(new Reception { WorkOrderId = order.Id, FuelPercent = r.FuelPercent, KeyCount = r.KeyCount, SpareTire = r.SpareTire, Jack = r.Jack, Tools = r.Tools, Belongings = r.Belongings, ExistingDamage = r.ExistingDamage,
            Checklist = r.Checklist.Select(c => new ReceptionCheck { Item = c.Item.Trim(), Condition = c.Condition, Notes = c.Notes }).ToList() });
        db.StatusHistory.Add(new StatusHistory { WorkOrderId = order.Id, AuthorId = actor, Current = OrderStatus.Ingresado, Comment = "Recepción del vehículo" });
        db.Audit.Add(new AuditEntry { ActorId = actor, Action = "Recibir vehículo", Resource = "Orden", ResourceId = order.Id });
        var access = await tracking.Issue(order);
        await db.SaveChangesAsync(); await tx.CommitAsync();
        return new { order.Id, order.Folio, access };
    }
    [HttpPost("{id:int}/status")]
    public Task<object> Transition(int id, TransitionRequest r) => workflow.Change(id, User, "Cambiar estado", async (o, actor) =>
    {
        if (User.IsInRole(Roles.Mechanic)) Rules.Require(r.Status is OrderStatus.Diagnostico or OrderStatus.EnReparacion or OrderStatus.Pruebas or OrderStatus.Reparado, "Tu rol no permite este cambio.", 403);
        await workflow.Transition(o, r, actor); return new { o.Status };
    });
    [HttpPost("{id:int}/assignments"), Authorize(Roles = Roles.Office)]
    public Task<object> Assign(int id, AssignmentRequest r) => workflow.Change(id, User, "Asignar mecánico", async (o, actor) =>
    {
        var mechanic = await users.FindByIdAsync(r.MechanicId);
        Rules.Require(mechanic is { Active: true } && await users.IsInRoleAsync(mechanic, Roles.Mechanic), "Selecciona un mecánico activo.");
        Rules.Require(!o.Assignments.Any(a => a.MechanicId == r.MechanicId && a.EndedAt == null), "El mecánico ya está asignado.");
        db.Assignments.Add(new Assignment { WorkOrderId = id, AuthorId = actor, MechanicId = r.MechanicId }); return new { message = "Asignado" };
    });
    [HttpPost("{id:int}/assignments/{assignmentId:int}/end"), Authorize(Roles = Roles.Office)]
    public Task<object> EndAssignment(int id, int assignmentId) => workflow.Change(id, User, "Finalizar asignación", (o, _) =>
    {
        var assignment = o.Assignments.SingleOrDefault(a => a.Id == assignmentId) ?? throw new BusinessException("Asignación no encontrada.", 404);
        assignment.EndedAt = DateTimeOffset.UtcNow; return Task.FromResult<object>(new { message = "Asignación finalizada" });
    });
    [HttpPost("{id:int}/diagnoses")]
    public Task<object> Diagnose(int id, DiagnosisRequest r) => workflow.Change(id, User, "Registrar diagnóstico", (o, actor) =>
    {
        Rules.Require(o.Status == OrderStatus.Diagnostico, "La orden debe estar en diagnóstico.");
        db.Diagnoses.Add(new Diagnosis { WorkOrderId = id, AuthorId = actor, Description = r.Description, Cause = r.Cause, Recommendation = r.Recommendation,
            Faults = r.Faults.Select(f => new Fault { Description = f.Description, Priority = f.Priority }).ToList() });
        return Task.FromResult<object>(new { message = "Diagnóstico registrado" });
    });
    [HttpPost("{id:int}/quotes"), Authorize(Roles = Roles.Office)]
    public Task<object> Quote(int id, QuoteRequest r) => workflow.Change(id, User, "Crear versión de cotización", (o, actor) =>
    {
        Rules.Require(o.Status == OrderStatus.Cotizacion, "La orden debe estar en cotización.");
        Rules.Require(r.ExpiresAt > DateTimeOffset.UtcNow, "La cotización debe tener una vigencia futura.");
        var lines = r.Lines.Select(l => new QuoteLine { Type = l.Type, Description = l.Description, Quantity = Rules.Money(l.Quantity), UnitPrice = Rules.Money(l.UnitPrice), Total = Rules.Money(Rules.Money(l.Quantity) * Rules.Money(l.UnitPrice)) }).ToList();
        var subtotal = lines.Sum(l => l.Total); var discount = Rules.Money(r.Discount);
        Rules.Require(discount <= subtotal, "El descuento supera el subtotal.");
        var tax = Rules.Money((subtotal - discount) * Rules.Money(r.TaxPercent) / 100);
        var total = subtotal - discount + tax;
        Rules.Require(total >= o.Payments.Sum(p => p.Amount), "El total no puede ser menor a los pagos recibidos; se requiere gestionar una devolución.");
        foreach (var pending in o.Quotes.Where(q => q.Status == QuoteStatus.Pendiente)) pending.Status = QuoteStatus.Sustituida;
        var quote = new Quote { WorkOrderId = id, AuthorId = actor, Version = o.Quotes.Select(q => q.Version).DefaultIfEmpty().Max() + 1,
            Lines = lines, Subtotal = subtotal, Discount = discount, TaxPercent = Rules.Money(r.TaxPercent), Tax = tax, Total = total, ExpiresAt = r.ExpiresAt };
        db.Quotes.Add(quote); return Task.FromResult<object>(new { quote.Version, quote.Total });
    });
    [HttpPost("{id:int}/quotes/{quoteId:int}/authorization"), Authorize(Roles = Roles.Office)]
    public Task<object> AuthorizeQuote(int id, int quoteId, AuthorizationRequest r) => workflow.Change(id, User, "Registrar consentimiento", (o, actor) =>
    {
        var quote = Rules.LatestQuote(o);
        Rules.Require(o.Status == OrderStatus.Autorizacion && quote?.Id == quoteId && quote.Status == QuoteStatus.Pendiente, "Solo se puede autorizar la última versión pendiente.");
        Rules.Require(quote!.ExpiresAt > DateTimeOffset.UtcNow, "La cotización venció. Genera una nueva versión.");
        quote.Status = r.Approved ? QuoteStatus.Autorizada : QuoteStatus.Rechazada;
        db.Add(new QuoteAuthorization { QuoteId = quoteId, Approved = r.Approved, ConsentEvidence = r.ConsentEvidence, RecordedById = actor });
        return Task.FromResult<object>(new { quote.Status });
    });
    [HttpPost("{id:int}/repairs")]
    public Task<object> Repair(int id, RepairRequest r) => workflow.Change(id, User, "Registrar trabajo", (o, actor) =>
    {
        var quote = Rules.LatestQuote(o);
        Rules.Require(o.Status == OrderStatus.EnReparacion && quote?.Status == QuoteStatus.Autorizada && quote.Lines.Any(l => l.Id == r.QuoteLineId), "El trabajo debe corresponder a un concepto de la última cotización autorizada.");
        db.Repairs.Add(new Repair { WorkOrderId = id, AuthorId = actor, QuoteLineId = r.QuoteLineId, Description = r.Description }); return Task.FromResult<object>(new { message = "Trabajo registrado" });
    });
    [HttpPost("{id:int}/repairs/{repairId:int}/complete")]
    public Task<object> CompleteRepair(int id, int repairId) => workflow.Change(id, User, "Finalizar trabajo", (o, _) =>
    {
        Rules.Require(o.Status == OrderStatus.EnReparacion, "La orden debe estar en reparación.");
        var repair = o.Repairs.SingleOrDefault(r => r.Id == repairId) ?? throw new BusinessException("Trabajo no encontrado.", 404);
        Rules.Require(repair.CompletedAt == null, "El trabajo ya está terminado.");
        repair.CompletedAt = DateTimeOffset.UtcNow; return Task.FromResult<object>(new { message = "Trabajo terminado" });
    });
    [HttpPost("{id:int}/tests")]
    public async Task<object> Test(int id, TestRequest r) => await workflow.Change(id, User, "Registrar prueba", async (o, actor) =>
    {
        Rules.Require(o.Status == OrderStatus.Pruebas, "La orden debe estar en pruebas.");
        db.Tests.Add(new VehicleTest { WorkOrderId = id, AuthorId = actor, Type = r.Type, Result = r.Result, Notes = r.Notes });
        if (r.Result != TestResult.Satisfactorio) await workflow.Transition(o, new TransitionRequest(OrderStatus.EnReparacion, "Prueba requiere corrección: " + r.Type), actor);
        return new { message = "Prueba registrada" };
    });
    [HttpPost("{id:int}/payments"), Authorize(Roles = Roles.Office)]
    public Task<object> Pay(int id, PaymentRequest r) => workflow.Change(id, User, "Registrar pago", (o, actor) =>
    {
        Rules.Require(Rules.LatestQuote(o)?.Status == QuoteStatus.Autorizada, "Se requiere una cotización actual autorizada para cobrar.");
        var amount = Rules.Money(r.Amount);
        Rules.Require(amount > 0 && amount <= Rules.Balance(o), "El monto supera el saldo pendiente o es inválido.");
        db.Payments.Add(new Payment { WorkOrderId = id, AuthorId = actor, Amount = amount, Method = r.Method, Reference = r.Reference });
        return Task.FromResult<object>(new { message = "Pago registrado" });
    });
    [HttpPost("{id:int}/delivery"), Authorize(Roles = Roles.Office)]
    public Task<object> Deliver(int id, DeliveryRequest r) => workflow.Change(id, User, "Entregar vehículo", async (o, actor) =>
    {
        await workflow.Deliver(o, r, actor);
        var expiry = DateTimeOffset.UtcNow.AddDays(config.GetValue<int>("Taller:DiasSeguimientoTrasEntrega"));
        foreach (var a in await db.TrackingAccesses.Where(a => a.WorkOrderId == id && !a.Revoked).ToListAsync()) a.ExpiresAt = a.ExpiresAt < expiry ? a.ExpiresAt : expiry;
        return new { message = "Vehículo entregado" };
    });
    [HttpPost("{id:int}/updates")]
    public Task<object> Update(int id, UpdateRequest r) => workflow.Change(id, User, "Registrar actualización", (_, actor) =>
    {
        db.Updates.Add(new OrderUpdate { WorkOrderId = id, AuthorId = actor, Title = r.Title, Message = r.Message, VisibleToCustomer = r.VisibleToCustomer });
        return Task.FromResult<object>(new { message = "Actualización registrada" });
    });
    [HttpPost("{id:int}/tracking"), Authorize(Roles = Roles.Office)]
    public Task<object> IssueTracking(int id) => workflow.Change(id, User, "Regenerar seguimiento", (o, _) => tracking.Issue(o), true);
    [HttpPost("{id:int}/tracking/revoke"), Authorize(Roles = Roles.Office)]
    public Task<object> RevokeTracking(int id) => workflow.Change(id, User, "Revocar seguimiento", async (_, _) =>
    {
        foreach (var a in await db.TrackingAccesses.Where(a => a.WorkOrderId == id && !a.Revoked).ToListAsync()) a.Revoked = true;
        return new { message = "Acceso revocado" };
    }, true);
}
