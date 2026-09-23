using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Taller.Web.Data;
using Taller.Web.Domain;

namespace Taller.Web.Services;
public class TrackingService(TallerDbContext db, IConfiguration config)
{
    public static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    public async Task<object> Issue(WorkOrder order)
    {
        var current = await db.TrackingAccesses.Where(x => x.WorkOrderId == order.Id && !x.Revoked).ToListAsync();
        foreach (var access in current) access.Revoked = true;
        // Save revocations before inserting because the filtered unique index allows one active credential.
        await db.SaveChangesAsync();
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var code = Convert.ToHexString(RandomNumberGenerator.GetBytes(8));
        var expiry = order.DeliveredAt?.AddDays(config.GetValue<int>("Taller:DiasSeguimientoTrasEntrega"))
            ?? DateTimeOffset.UtcNow.AddDays(config.GetValue<int>("Taller:DiasSeguimiento"));
        Rules.Require(expiry > DateTimeOffset.UtcNow, "El periodo de seguimiento de esta entrega terminó.");
        db.TrackingAccesses.Add(new TrackingAccess { WorkOrderId = order.Id, TokenHash = Hash(token), CodeHash = Hash(code), ExpiresAt = expiry });
        var url = config["Taller:PublicBaseUrl"]!.TrimEnd('/') + "/seguimiento#" + token;
        using var qr = QRCoder.QRCodeGenerator.GenerateQrCode(url, QRCoder.QRCodeGenerator.ECCLevel.Q);
        var svg = new QRCoder.SvgQRCode(qr).GetGraphic(5);
        return new { order.Folio, code, url, qrSvg = svg, expiresAt = expiry };
    }
}
