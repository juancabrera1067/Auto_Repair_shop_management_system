using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Taller.Web.Contracts;
using Taller.Web.Data;
using Taller.Web.Domain;
using Taller.Web.Services;
namespace Taller.Web.Controllers;

[ApiController, Route("api/tracking")]
public class TrackingController(TallerDbContext db, IDataProtectionProvider protection, IWebHostEnvironment env, StoragePaths storage) : ControllerBase
{
    private const string Cookie = "Taller.Tracking";
    private ITimeLimitedDataProtector Protector => protection.CreateProtector("tracking-session-v1").ToTimeLimitedDataProtector();
    [HttpPost("access"), EnableRateLimiting("credentials")]
    public async Task<IActionResult> Access(TrackingRequest r)
    {
        var now = DateTimeOffset.UtcNow;
        TrackingAccess? access;
        if (!string.IsNullOrWhiteSpace(r.Token))
        {
            var hash = TrackingService.Hash(r.Token);
            access = await db.TrackingAccesses.SingleOrDefaultAsync(a => a.TokenHash == hash && !a.Revoked && a.ExpiresAt > now);
        }
        else
        {
            var folio = r.Folio?.Trim().ToUpperInvariant();
            access = await db.TrackingAccesses.SingleOrDefaultAsync(a => a.WorkOrder.Folio == folio && !a.Revoked && a.ExpiresAt > now);
            if (access is not null)
            {
                var given = TrackingService.Hash(r.Code?.Trim().ToUpperInvariant() ?? "");
                if (access.LockedUntil > now || !CryptographicOperations.FixedTimeEquals(Convert.FromHexString(access.CodeHash), Convert.FromHexString(given)))
                {
                    // Atomic increment prevents parallel attempts from overwriting each other.
                    await db.TrackingAccesses.Where(a => a.Id == access.Id).ExecuteUpdateAsync(s => s
                        .SetProperty(a => a.FailedAttempts, a => a.FailedAttempts + 1)
                        .SetProperty(a => a.LockedUntil, a => a.FailedAttempts >= 4 ? now.AddMinutes(15) : a.LockedUntil));
                    access = null;
                }
            }
        }
        if (access is null) return Unauthorized(new { detail = "No se pudo validar el acceso. Revisa tus datos o solicita un nuevo código al taller." });
        access.LastAccess = now; access.FailedAttempts = 0; access.LockedUntil = null; await db.SaveChangesAsync();
        Response.Cookies.Append(Cookie, Protector.Protect(access.Id.ToString(), TimeSpan.FromHours(1)), new CookieOptions
        { HttpOnly = true, SameSite = SameSiteMode.Strict, Secure = !env.IsDevelopment(), Path = "/api/tracking", MaxAge = TimeSpan.FromHours(1) });
        return Ok(new { message = "Acceso validado" });
    }
    private async Task<TrackingAccess> Resolve()
    {
        int id;
        try { id = int.Parse(Protector.Unprotect(Request.Cookies[Cookie] ?? "")); }
        catch (Exception ex) when (ex is CryptographicException or FormatException or OverflowException) { throw new BusinessException("Ingresa tu folio y código para consultar la orden.", 401); }
        var now = DateTimeOffset.UtcNow;
        return await db.TrackingAccesses.AsNoTracking().Include(a => a.WorkOrder).ThenInclude(o => o.Vehicle)
            .SingleOrDefaultAsync(a => a.Id == id && !a.Revoked && a.ExpiresAt > now && a.LastAccess > now.AddHours(-1))
            ?? throw new BusinessException("El acceso venció o fue revocado. Solicita un nuevo código al taller.", 401);
    }
    [HttpGet("order")]
    public async Task<object> Order()
    {
        var access = await Resolve(); var o = access.WorkOrder;
        var quote = await db.Quotes.Where(q => q.WorkOrderId == o.Id).OrderByDescending(q => q.Version).FirstOrDefaultAsync();
        var total = await db.Quotes.Where(q => q.WorkOrderId == o.Id && q.Status == QuoteStatus.Autorizada).OrderByDescending(q => q.Version).Select(q => (decimal?)q.Total).FirstOrDefaultAsync() ?? 0;
        var paid = await db.Payments.Where(p => p.WorkOrderId == o.Id).SumAsync(p => p.Amount);
        return new
        {
            o.Folio, status = PublicStatus(o.Status), o.UpdatedAt, o.EstimatedDelivery, o.DeliveredAt,
            vehicle = new { o.Vehicle.Brand, o.Vehicle.Model, o.Vehicle.Year, o.Vehicle.Plate }, balance = total - paid,
            updates = await db.Updates.Where(u => u.WorkOrderId == o.Id && u.VisibleToCustomer).OrderByDescending(u => u.Id).Select(u => new { u.Title, u.Message, u.CreatedAt }).ToListAsync(),
            evidence = await db.Evidence.Where(e => e.WorkOrderId == o.Id && e.VisibleToCustomer).Select(e => new { e.Id, e.Description, e.Stage, e.CreatedAt }).ToListAsync(),
            quote = quote == null ? null : new { quote.Version, quote.Status, quote.Subtotal, quote.Discount, quote.Tax, quote.Total, quote.ExpiresAt,
                lines = await db.Set<QuoteLine>().Where(l => l.QuoteId == quote.Id).Select(l => new { l.Description, l.Quantity, l.UnitPrice, l.Total }).ToListAsync() }
        };
    }
    internal static string PublicStatus(OrderStatus status) => status switch
    {
        OrderStatus.Ingresado or OrderStatus.EnEspera => "Recibido",
        OrderStatus.Diagnostico => "En diagnóstico",
        OrderStatus.Cotizacion or OrderStatus.Autorizacion => "Cotización",
        OrderStatus.EnReparacion => "En reparación",
        OrderStatus.Pruebas or OrderStatus.Reparado => "Verificación final",
        OrderStatus.ListoParaEntrega => "Listo para entrega",
        _ => "Entregado"
    };
    [HttpGet("evidence/{id:int}")]
    public async Task<IActionResult> Evidence(int id)
    {
        var access = await Resolve();
        var file = await db.Evidence.SingleOrDefaultAsync(e => e.Id == id && e.WorkOrderId == access.WorkOrderId && e.VisibleToCustomer)
            ?? throw new BusinessException("Archivo no encontrado.", 404);
        return PhysicalFile(Path.Combine(storage.Evidence, file.StoredName), file.ContentType, file.OriginalName);
    }
    [HttpPost("logout")]
    public IActionResult Logout() { Response.Cookies.Delete(Cookie, new CookieOptions { Path = "/api/tracking" }); return NoContent(); }
}
