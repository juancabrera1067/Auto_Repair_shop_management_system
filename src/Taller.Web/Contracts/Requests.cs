using System.ComponentModel.DataAnnotations;
using Taller.Web.Domain;
namespace Taller.Web.Contracts;

public record LoginRequest([Required, EmailAddress] string Email, [Required] string Password);
public record PasswordRequest([Required] string CurrentPassword, [Required, StringLength(128, MinimumLength = 12)] string NewPassword);
public record UserRequest([Required, StringLength(150)] string FullName, [Required, EmailAddress, StringLength(254)] string Email,
    [Required, StringLength(128, MinimumLength = 12)] string Password, [Required] string Role);
public record CustomerRequest([Required, StringLength(150)] string Name, [Required, StringLength(30)] string Phone,
    [EmailAddress, StringLength(254)] string? Email, [StringLength(400)] string? Address, bool Active = true);
public record VehicleRequest(int CustomerId, [Required, StringLength(60)] string Brand, [Required, StringLength(80)] string Model,
    [Range(1900, 2100)] int Year, [Required, StringLength(20)] string Plate, [RegularExpression("^[A-HJ-NPR-Z0-9]{17}$")] string? Vin,
    [Range(0, 10000000)] int Mileage, [StringLength(40)] string? Color, [StringLength(40)] string? Fuel, [StringLength(40)] string? Transmission, bool Active = true);
public record ServiceRequest([Required, StringLength(120)] string Name, [StringLength(1000)] string? Description,
    [Range(typeof(decimal), "0", "10000000")] decimal BasePrice, [Range(1, 10080)] int EstimatedMinutes, bool Active = true);
public record AppointmentRequest(int VehicleId, int ServiceId, DateTimeOffset StartsAt, DateTimeOffset EndsAt, [Required, StringLength(1000)] string Reason);
public record AppointmentStatusRequest([EnumDataType(typeof(AppointmentStatus))] AppointmentStatus Status);
public record CheckRequest([Required, StringLength(100)] string Item, [Required, RegularExpression("^(Bien|Daño|No aplica)$")] string Condition, [StringLength(500)] string? Notes);
public record ReceiveRequest(int VehicleId, int? AppointmentId, [Range(0, 10000000)] int EntryMileage,
    [Required, StringLength(2000)] string Reason, [EnumDataType(typeof(Priority))] Priority Priority, DateTimeOffset? EstimatedDelivery,
    [Range(0, 100)] int FuelPercent, [Range(0, 20)] int KeyCount, bool SpareTire, bool Jack, bool Tools,
    [StringLength(2000)] string? Belongings, [StringLength(2000)] string? ExistingDamage,
    [Required, MinLength(1), MaxLength(30)] List<CheckRequest> Checklist);
public record TransitionRequest([EnumDataType(typeof(OrderStatus))] OrderStatus Status, [StringLength(1000)] string? Comment);
public record AssignmentRequest([Required] string MechanicId);
public record FaultRequest([Required, StringLength(1000)] string Description, [EnumDataType(typeof(Priority))] Priority Priority);
public record DiagnosisRequest([Required, StringLength(4000)] string Description, [Required, StringLength(2000)] string Cause,
    [Required, StringLength(2000)] string Recommendation, [Required, MaxLength(30)] List<FaultRequest> Faults);
public record QuoteLineRequest([Required, RegularExpression("^(Refaccion|ManoDeObra|Servicio)$")] string Type,
    [Required, StringLength(500)] string Description, [Range(typeof(decimal), "0.01", "10000")] decimal Quantity,
    [Range(typeof(decimal), "0", "10000000")] decimal UnitPrice);
public record QuoteRequest([Required, MinLength(1), MaxLength(100)] List<QuoteLineRequest> Lines,
    [Range(typeof(decimal), "0", "10000000")] decimal Discount,
    [Range(typeof(decimal), "0", "100")] decimal TaxPercent, DateTimeOffset ExpiresAt);
public record AuthorizationRequest(bool Approved, [Required, StringLength(2000, MinimumLength = 10)] string ConsentEvidence);
public record RepairRequest(int QuoteLineId, [Required, StringLength(3000)] string Description);
public record TestRequest([Required, StringLength(100)] string Type, [EnumDataType(typeof(TestResult))] TestResult Result, [Required, StringLength(2000)] string Notes);
public record PaymentRequest([Range(typeof(decimal), "0.01", "10000000")] decimal Amount,
    [Required, RegularExpression("^(Efectivo|Tarjeta|Transferencia|Otro)$")] string Method, [StringLength(100)] string? Reference);
public record DeliveryRequest([Range(0, 10000000)] int ExitMileage, [Required, StringLength(150)] string ReceivedBy, bool CustomerAccepted, [StringLength(2000)] string? Notes);
public record UpdateRequest([Required, StringLength(150)] string Title, [Required, StringLength(3000)] string Message, bool VisibleToCustomer);
public record TrackingRequest([StringLength(200)] string? Token, [StringLength(30)] string? Folio, [StringLength(30)] string? Code);
