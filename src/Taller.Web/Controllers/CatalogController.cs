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

[ApiController, Authorize(Roles = Roles.Office), Route("api")]
public class CatalogController(TallerDbContext db, UserManager<StaffUser> users, IConfiguration config) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private async Task Save(string action, string resource, Entity entity)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        await db.SaveChangesAsync();
        db.Audit.Add(new AuditEntry { ActorId = Actor, Action = action, Resource = resource, ResourceId = entity.Id });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
    }
    [HttpGet("settings"), AllowAnonymous]
    public object Settings() => new { name = config["Taller:Nombre"], currency = config["Taller:Moneda"], timeZone = config["Taller:ZonaHoraria"], taxPercent = config.GetValue<decimal>("Taller:ImpuestoPorcentaje"), requirePayment = config.GetValue<bool>("Taller:ExigirPagoParaEntrega") };
    [HttpGet("customers")]
    public async Task<object> Customers() => await db.Customers.AsNoTracking().OrderBy(x => x.Name).ToListAsync();
    [HttpPost("customers")]
    public async Task<object> CreateCustomer(CustomerRequest r)
    {
        var customer = new Customer(); Apply(customer, r); db.Customers.Add(customer); await Save("Crear", "Cliente", customer); return new { customer.Id };
    }
    [HttpPut("customers/{id:int}")]
    public async Task<IActionResult> UpdateCustomer(int id, CustomerRequest r)
    {
        var customer = await db.Customers.FindAsync(id) ?? throw new BusinessException("Cliente no encontrado.", 404);
        Apply(customer, r); await Save("Actualizar", "Cliente", customer); return NoContent();
    }
    private static void Apply(Customer c, CustomerRequest r) { c.Name = r.Name.Trim(); c.Phone = r.Phone.Trim(); c.Email = r.Email?.Trim(); c.Address = r.Address?.Trim(); c.Active = r.Active; }
    [HttpGet("vehicles")]
    public async Task<object> Vehicles() => await db.Vehicles.AsNoTracking().Include(v => v.Customer).OrderBy(v => v.Plate).Select(v => new { v.Id, v.CustomerId, customer = v.Customer.Name, v.Brand, v.Model, v.Year, v.Plate, v.Vin, v.Mileage, v.Color, v.Fuel, v.Transmission, v.Active }).ToListAsync();
    [HttpPost("vehicles")]
    public async Task<object> CreateVehicle(VehicleRequest r)
    {
        var vehicle = new Vehicle(); await Apply(vehicle, r); db.Vehicles.Add(vehicle); await Save("Crear", "Vehiculo", vehicle); return new { vehicle.Id };
    }
    [HttpPut("vehicles/{id:int}")]
    public async Task<IActionResult> UpdateVehicle(int id, VehicleRequest r)
    {
        var vehicle = await db.Vehicles.FindAsync(id) ?? throw new BusinessException("Vehículo no encontrado.", 404);
        Rules.Require(vehicle.CustomerId == r.CustomerId, "El cambio de propietario requiere un proceso específico para conservar el historial.");
        Rules.Require(r.Mileage >= vehicle.Mileage, "El kilometraje no puede disminuir.");
        await Apply(vehicle, r); await Save("Actualizar", "Vehiculo", vehicle); return NoContent();
    }
    private async Task Apply(Vehicle v, VehicleRequest r)
    {
        Rules.Require(await db.Customers.AnyAsync(c => c.Id == r.CustomerId && c.Active), "Selecciona un cliente activo.");
        v.CustomerId = r.CustomerId; v.Brand = r.Brand.Trim(); v.Model = r.Model.Trim(); v.Year = r.Year; v.Plate = r.Plate.Trim().ToUpperInvariant();
        v.Vin = string.IsNullOrWhiteSpace(r.Vin) ? null : r.Vin.Trim().ToUpperInvariant(); v.Mileage = r.Mileage; v.Color = r.Color; v.Fuel = r.Fuel; v.Transmission = r.Transmission; v.Active = r.Active;
    }
    [HttpGet("services")]
    public async Task<object> Services() => await db.Services.AsNoTracking().OrderBy(s => s.Name).ToListAsync();
    [HttpPost("services")]
    public async Task<object> CreateService(ServiceRequest r)
    {
        var service = new Service(); Apply(service, r); db.Services.Add(service); await Save("Crear", "Servicio", service); return new { service.Id };
    }
    [HttpPut("services/{id:int}")]
    public async Task<IActionResult> UpdateService(int id, ServiceRequest r)
    {
        var service = await db.Services.FindAsync(id) ?? throw new BusinessException("Servicio no encontrado.", 404);
        Apply(service, r); await Save("Actualizar", "Servicio", service); return NoContent();
    }
    private static void Apply(Service s, ServiceRequest r) { s.Name = r.Name.Trim(); s.Description = r.Description; s.BasePrice = Rules.Money(r.BasePrice); s.EstimatedMinutes = r.EstimatedMinutes; s.Active = r.Active; }
    [HttpGet("appointments")]
    public async Task<object> Appointments() => await db.Appointments.AsNoTracking().OrderByDescending(x => x.StartsAt).Select(x => new { x.Id, x.VehicleId, x.ServiceId, x.StartsAt, x.EndsAt, x.Reason, x.Status, vehicle = x.Vehicle.Brand + " " + x.Vehicle.Model, x.Vehicle.Plate, customer = x.Vehicle.Customer.Name, service = x.Service.Name }).ToListAsync();
    [HttpPost("appointments")]
    public async Task<object> CreateAppointment(AppointmentRequest r)
    {
        Rules.Require(r.EndsAt > r.StartsAt && r.EndsAt - r.StartsAt <= TimeSpan.FromHours(24), "Revisa el inicio y fin de la cita.");
        Rules.Require(await db.Vehicles.AnyAsync(v => v.Id == r.VehicleId && v.Active && v.Customer.Active), "Selecciona un vehículo activo.");
        Rules.Require(await db.Services.AnyAsync(s => s.Id == r.ServiceId && s.Active), "Selecciona un servicio activo.");
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        Rules.Require(!await db.Appointments.AnyAsync(a => a.VehicleId == r.VehicleId && a.Status != AppointmentStatus.Cancelada && a.Status != AppointmentStatus.NoAsistio && a.StartsAt < r.EndsAt && a.EndsAt > r.StartsAt), "El vehículo ya tiene una cita en ese horario.");
        var appointment = new Appointment { VehicleId = r.VehicleId, ServiceId = r.ServiceId, StartsAt = r.StartsAt, EndsAt = r.EndsAt, Reason = r.Reason, CreatedById = Actor };
        db.Appointments.Add(appointment); await db.SaveChangesAsync();
        db.Audit.Add(new AuditEntry { ActorId = Actor, Action = "Crear", Resource = "Cita", ResourceId = appointment.Id });
        await db.SaveChangesAsync(); await tx.CommitAsync(); return new { appointment.Id };
    }
    [HttpPost("appointments/{id:int}/status")]
    public async Task<IActionResult> AppointmentStatusChange(int id, AppointmentStatusRequest r)
    {
        var appointment = await db.Appointments.FindAsync(id) ?? throw new BusinessException("Cita no encontrada.", 404);
        Rules.Require(appointment.Status != AppointmentStatus.Atendida && r.Status != AppointmentStatus.Atendida, "La cita se marca atendida al recibir el vehículo.");
        appointment.Status = r.Status; await Save("Cambiar estado", "Cita", appointment); return NoContent();
    }
    [HttpGet("users"), Authorize(Roles = Roles.Admin)]
    public async Task<object> Users()
    {
        var result = new List<object>();
        foreach (var user in await db.Users.OrderBy(u => u.FullName).ToListAsync()) result.Add(new { user.Id, user.FullName, user.Email, user.Active, roles = await users.GetRolesAsync(user) });
        return result;
    }
    [HttpGet("mechanics")]
    public async Task<object> Mechanics() => (await users.GetUsersInRoleAsync(Roles.Mechanic)).Where(u => u.Active).Select(u => new { u.Id, u.FullName });
    [HttpPost("users"), Authorize(Roles = Roles.Admin)]
    public async Task<object> CreateUser(UserRequest r)
    {
        Rules.Require(new[] { Roles.Admin, Roles.Reception, Roles.Mechanic }.Contains(r.Role), "Rol inválido.");
        await using var tx = await db.Database.BeginTransactionAsync();
        var user = new StaffUser { FullName = r.FullName.Trim(), Email = r.Email.Trim(), UserName = r.Email.Trim() };
        var result = await users.CreateAsync(user, r.Password);
        Rules.Require(result.Succeeded, string.Join(" ", result.Errors.Select(e => e.Description)));
        var roleResult = await users.AddToRoleAsync(user, r.Role); Rules.Require(roleResult.Succeeded, "No se pudo asignar el rol.");
        db.Audit.Add(new AuditEntry { ActorId = Actor, Action = "Crear usuario " + r.Role, Resource = "Usuario" });
        await db.SaveChangesAsync(); await tx.CommitAsync(); return new { user.Id };
    }
    [HttpPost("users/{id}/deactivate"), Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> DeactivateUser(string id)
    {
        Rules.Require(id != Actor, "No puedes desactivar tu propia cuenta.");
        var user = await users.FindByIdAsync(id) ?? throw new BusinessException("Usuario no encontrado.", 404);
        user.Active = false; await users.UpdateAsync(user);
        db.Audit.Add(new AuditEntry { ActorId = Actor, Action = "Desactivar usuario", Resource = "Usuario" }); await db.SaveChangesAsync(); return NoContent();
    }
    [HttpGet("audit"), Authorize(Roles = Roles.Admin)]
    public async Task<object> Audit() => await db.Audit.AsNoTracking().OrderByDescending(x => x.Id).Take(200).Select(x => new { x.Id, actor = x.Actor.FullName, x.Action, x.Resource, x.ResourceId, x.CreatedAt }).ToListAsync();
}
