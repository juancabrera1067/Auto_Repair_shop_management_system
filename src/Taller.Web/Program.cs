using System.Security.Claims;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Taller.Web.Data;
using Taller.Web.Domain;
using Taller.Web.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true).AddEnvironmentVariables();
builder.Services.AddDbContext<TallerDbContext>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("Taller")));
builder.Services.AddIdentityCore<StaffUser>(o =>
{
    o.Password.RequiredLength = 12;
    o.User.RequireUniqueEmail = true;
    o.Lockout.MaxFailedAccessAttempts = 5;
    o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
}).AddRoles<IdentityRole>().AddEntityFrameworkStores<TallerDbContext>().AddSignInManager();
builder.Services.AddAuthentication(IdentityConstants.ApplicationScheme).AddCookie(IdentityConstants.ApplicationScheme, o =>
{
    o.Cookie.Name = "Taller.Staff";
    o.Cookie.HttpOnly = true;
    o.Cookie.SameSite = SameSiteMode.Strict;
    o.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
    o.ExpireTimeSpan = TimeSpan.FromHours(8);
    o.Events = new CookieAuthenticationEvents
    {
        OnRedirectToLogin = c => { c.Response.StatusCode = 401; return Task.CompletedTask; },
        OnRedirectToAccessDenied = c => { c.Response.StatusCode = 403; return Task.CompletedTask; },
        OnValidatePrincipal = async c =>
        {
            var users = c.HttpContext.RequestServices.GetRequiredService<UserManager<StaffUser>>();
            var user = await users.GetUserAsync(c.Principal!);
            if (user is null || !user.Active || c.Principal!.FindFirstValue("AspNet.Identity.SecurityStamp") != user.SecurityStamp)
                c.RejectPrincipal();
        }
    };
});
builder.Services.AddAuthorization();
builder.Services.AddAntiforgery(o => { o.HeaderName = "X-CSRF-TOKEN"; o.Cookie.SameSite = SameSiteMode.Strict; });
builder.Services.AddControllersWithViews(o => o.Filters.Add(new AutoValidateAntiforgeryTokenAttribute()))
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddPolicy("credentials", c => RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString() ?? "local", _ => new FixedWindowRateLimiterOptions
    { PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 0, AutoReplenishment = true }));
});
builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<TrackingService>();
var storage = new StoragePaths(builder.Environment, builder.Configuration);
builder.Services.AddSingleton(storage);
Directory.CreateDirectory(storage.Keys);
var dataProtection = builder.Services.AddDataProtection().SetApplicationName("TallerAutomotriz").PersistKeysToFileSystem(new DirectoryInfo(storage.Keys));
if (OperatingSystem.IsWindows()) dataProtection.ProtectKeysWithDpapi();
var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TallerDbContext>();
    if (args.Contains("--export-sql"))
    {
        Console.WriteLine(db.Database.GenerateCreateScript());
        return;
    }
    if (app.Environment.IsDevelopment() || args.Contains("--migrate"))
    {
        await db.Database.MigrateAsync();
        await DbInitializer.Seed(scope.ServiceProvider);
    }
    if (args.Contains("--migrate")) return;
}
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
    if (context.Request.Path.StartsWithSegments("/api")) context.Response.Headers.CacheControl = "no-store";
    try { await next(); }
    catch (BusinessException ex) { await Results.Problem(detail: ex.Message, statusCode: ex.Status).ExecuteAsync(context); }
    catch (DbUpdateConcurrencyException) { await Results.Problem(detail: "Otro usuario modificó el registro. Actualiza la página e intenta de nuevo.", statusCode: 409).ExecuteAsync(context); }
    catch (Exception ex) when (ex.GetBaseException() is SqlException { Number: 1205 })
    {
        await Results.Problem(detail: "Otra operación estaba modificando los mismos registros. Actualiza y vuelve a intentarlo.", statusCode: 409).ExecuteAsync(context);
    }
    catch (DbUpdateException ex)
    {
        app.Logger.LogWarning(ex, "Conflicto de integridad al guardar");
        await Results.Problem(detail: "No se pudo guardar: existe un dato duplicado o una relación incompatible.", statusCode: 409).ExecuteAsync(context);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Error procesando {Path}", context.Request.Path);
        await Results.Problem(detail: "No se pudo completar la operación. Consulta el registro del servidor.", statusCode: 500).ExecuteAsync(context);
    }
});
if (!app.Environment.IsDevelopment()) { app.UseHsts(); app.UseHttpsRedirection(); }
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRouting();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/seguimiento", () => Results.File(Path.Combine(app.Environment.WebRootPath, "seguimiento.html"), "text/html"));
app.Run();

public partial class Program { }
