using System.Data;
using System.Net;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Taller.Web.Contracts;
using Taller.Web.Data;
using Taller.Web.Domain;
using Taller.Web.Services;
namespace Taller.Web.Controllers;

[ApiController, Route("api/auth")]
public class AuthController(TallerDbContext db, UserManager<StaffUser> users, SignInManager<StaffUser> signIn, IAntiforgery csrf, IWebHostEnvironment env) : ControllerBase
{
    [HttpGet("csrf")]
    public object Csrf() => new { token = csrf.GetAndStoreTokens(HttpContext).RequestToken };
    [HttpGet("session")]
    public async Task<object> Session()
    {
        var user = User.Identity?.IsAuthenticated == true ? await users.GetUserAsync(User) : null;
        return new { user = user is null ? null : new { user.Id, user.FullName, user.Email, roles = await users.GetRolesAsync(user) },
            needsSetup = env.IsDevelopment() && IsLocal() && !await db.Users.AnyAsync() };
    }
    private bool IsLocal() => HttpContext.Connection.RemoteIpAddress is { } ip && IPAddress.IsLoopback(ip);
    [HttpPost("setup"), EnableRateLimiting("credentials")]
    public async Task<IActionResult> Setup(UserRequest request)
    {
        Rules.Require(env.IsDevelopment() && IsLocal(), "La configuración inicial solo está disponible en desarrollo local.", 403);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        Rules.Require(!await db.Users.AnyAsync(), "El administrador inicial ya existe.", 409);
        var user = new StaffUser { FullName = request.FullName.Trim(), UserName = request.Email.Trim(), Email = request.Email.Trim() };
        var result = await users.CreateAsync(user, request.Password);
        Rules.Require(result.Succeeded, string.Join(" ", result.Errors.Select(e => e.Description)));
        var role = await users.AddToRoleAsync(user, Roles.Admin);
        Rules.Require(role.Succeeded, "No se pudo asignar el rol administrador.");
        await transaction.CommitAsync();
        await signIn.SignInAsync(user, false);
        return Ok(new { message = "Administrador creado." });
    }
    [HttpPost("login"), EnableRateLimiting("credentials")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var user = await users.FindByEmailAsync(request.Email.Trim());
        // Run a password hash even for unknown users to reduce timing differences.
        if (user is null)
        {
            _ = new PasswordHasher<StaffUser>().HashPassword(new StaffUser(), request.Password);
            return Unauthorized(new { detail = "Credenciales inválidas o acceso temporalmente bloqueado." });
        }
        var result = user.Active ? await signIn.CheckPasswordSignInAsync(user, request.Password, true) : Microsoft.AspNetCore.Identity.SignInResult.Failed;
        if (!result.Succeeded) return Unauthorized(new { detail = "Credenciales inválidas o acceso temporalmente bloqueado." });
        await signIn.SignInAsync(user, false);
        return Ok(new { message = "Sesión iniciada." });
    }
    [Authorize, HttpPost("logout")]
    public async Task<IActionResult> Logout() { await signIn.SignOutAsync(); return NoContent(); }
    [Authorize, HttpPost("password"), EnableRateLimiting("credentials")]
    public async Task<IActionResult> ChangePassword(PasswordRequest request)
    {
        var user = await users.GetUserAsync(User) ?? throw new BusinessException("Sesión no válida.", 401);
        var result = await users.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        Rules.Require(result.Succeeded, string.Join(" ", result.Errors.Select(e => e.Description)));
        await signIn.RefreshSignInAsync(user);
        db.Audit.Add(new AuditEntry { ActorId = user.Id, Action = "Cambiar contraseña", Resource = "Usuario" });
        await db.SaveChangesAsync();
        return NoContent();
    }
}
