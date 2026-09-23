using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Taller.Web.Domain;
namespace Taller.Web.Data;
public static class DbInitializer
{
    public static async Task Seed(IServiceProvider services)
    {
        var roles = services.GetRequiredService<RoleManager<IdentityRole>>();
        foreach (var name in new[] { Roles.Admin, Roles.Reception, Roles.Mechanic })
            if (!await roles.RoleExistsAsync(name)) await roles.CreateAsync(new IdentityRole(name));
        var db = services.GetRequiredService<TallerDbContext>();
        if (!await db.Services.AnyAsync())
        {
            db.Services.AddRange(
                new Service { Name = "Diagnóstico general", Description = "Revisión inicial y diagnóstico del vehículo", EstimatedMinutes = 60, BasePrice = 0 },
                new Service { Name = "Mantenimiento preventivo", Description = "Inspección y mantenimiento programado", EstimatedMinutes = 120, BasePrice = 0 });
            await db.SaveChangesAsync();
        }
        var config = services.GetRequiredService<IConfiguration>();
        var email = config["Bootstrap:Email"];
        var password = config["Bootstrap:Password"];
        if (!string.IsNullOrEmpty(email) && !string.IsNullOrEmpty(password) && !await db.Users.AnyAsync())
        {
            var users = services.GetRequiredService<UserManager<StaffUser>>();
            var user = new StaffUser { UserName = email, Email = email, FullName = "Administrador" };
            var result = await users.CreateAsync(user, password);
            if (!result.Succeeded) throw new InvalidOperationException(string.Join(" ", result.Errors.Select(e => e.Description)));
            await users.AddToRoleAsync(user, Roles.Admin);
        }
    }
}
