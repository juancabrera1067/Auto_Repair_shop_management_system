using Taller.Web.Domain;
namespace Taller.Web.Services;

public class BusinessException(string message, int status = 400) : Exception(message) { public int Status { get; } = status; }
public static class Rules
{
    public static void Require(bool condition, string message, int status = 400) { if (!condition) throw new BusinessException(message, status); }
    public static decimal Money(decimal n) => decimal.Round(n, 2, MidpointRounding.AwayFromZero);
    public static Quote? LatestQuote(WorkOrder o) => o.Quotes.OrderByDescending(q => q.Version).FirstOrDefault();
    public static decimal Balance(WorkOrder o) => (o.Quotes.Where(q => q.Status == QuoteStatus.Autorizada).OrderByDescending(q => q.Version).FirstOrDefault()?.Total ?? 0) - o.Payments.Sum(p => p.Amount);
    public static OrderStatus[] Next(OrderStatus state) => state switch
    {
        OrderStatus.Ingresado => [OrderStatus.EnEspera, OrderStatus.Diagnostico],
        OrderStatus.EnEspera => [OrderStatus.Diagnostico],
        OrderStatus.Diagnostico => [OrderStatus.Cotizacion],
        OrderStatus.Cotizacion => [OrderStatus.Autorizacion, OrderStatus.Diagnostico],
        OrderStatus.Autorizacion => [OrderStatus.EnReparacion],
        OrderStatus.EnReparacion => [OrderStatus.Pruebas],
        OrderStatus.Pruebas => [OrderStatus.Reparado, OrderStatus.EnReparacion],
        OrderStatus.Reparado => [OrderStatus.ListoParaEntrega],
        OrderStatus.ListoParaEntrega => [OrderStatus.EnReparacion],
        OrderStatus.Entregado => [],
        _ => []
    };
}
