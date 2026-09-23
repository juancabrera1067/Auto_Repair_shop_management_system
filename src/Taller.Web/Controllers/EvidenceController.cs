using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Taller.Web.Data;
using Taller.Web.Domain;
using Taller.Web.Services;
namespace Taller.Web.Controllers;

[ApiController, Authorize, Route("api/orders/{id:int}/evidence")]
public class EvidenceController(TallerDbContext db, OrderService orders, StoragePaths storage) : ControllerBase
{
    [HttpPost, RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<object> Upload(int id, IFormFile file, [FromForm] string description, [FromForm] string stage, [FromForm] bool visibleToCustomer)
    {
        Rules.Require(file.Length is > 0 and <= 5 * 1024 * 1024, "Cada archivo debe pesar como máximo 5 MB.");
        Rules.Require(!string.IsNullOrWhiteSpace(description) && description.Length <= 500, "Agrega una descripción de hasta 500 caracteres.");
        Rules.Require(new[] { "Recepcion", "Daño", "Diagnostico", "Refaccion", "Reparacion", "Prueba", "Entrega" }.Contains(stage), "Etapa de evidencia inválida.");
        await using var memory = new MemoryStream(); await file.CopyToAsync(memory); var bytes = memory.ToArray();
        var kind = FileKind(bytes);
        Rules.Require(kind != null, "Solo se permiten imágenes JPEG, PNG y archivos PDF válidos.");
        var directory = storage.Evidence;
        var storedName = Guid.NewGuid().ToString("N") + kind!.Value.Extension;
        var path = Path.Combine(directory, storedName);
        try
        {
            return await orders.Change(id, User, "Adjuntar evidencia", async (_, actor) =>
            {
                Directory.CreateDirectory(directory); await System.IO.File.WriteAllBytesAsync(path, bytes);
                db.Evidence.Add(new Evidence { WorkOrderId = id, AuthorId = actor, StoredName = storedName,
                    OriginalName = Path.GetFileName(file.FileName)[..Math.Min(Path.GetFileName(file.FileName).Length, 200)], ContentType = kind.Value.Mime,
                    Size = bytes.Length, Description = description, Stage = stage, VisibleToCustomer = visibleToCustomer });
                return new { message = "Evidencia guardada" };
            });
        }
        catch { if (System.IO.File.Exists(path)) System.IO.File.Delete(path); throw; }
    }
    internal static (string Extension, string Mime)? FileKind(byte[] bytes)
    {
        if (bytes.Length >= 8 && bytes.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 })) return (".png", "image/png");
        if (bytes.Length >= 3 && bytes[0] == 255 && bytes[1] == 216 && bytes[2] == 255) return (".jpg", "image/jpeg");
        if (bytes.Length >= 5 && bytes.AsSpan(0, 5).SequenceEqual("%PDF-"u8)) return (".pdf", "application/pdf");
        return null;
    }
    [HttpGet("{evidenceId:int}")]
    public async Task<IActionResult> Download(int id, int evidenceId)
    {
        Rules.Require(await orders.Visible(User).AnyAsync(o => o.Id == id), "Orden no encontrada.", 404);
        var file = await db.Evidence.SingleOrDefaultAsync(e => e.Id == evidenceId && e.WorkOrderId == id) ?? throw new BusinessException("Archivo no encontrado.", 404);
        return PhysicalFile(Path.Combine(storage.Evidence, file.StoredName), file.ContentType, file.OriginalName);
    }
}
