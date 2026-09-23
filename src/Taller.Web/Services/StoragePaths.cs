namespace Taller.Web.Services;

public sealed class StoragePaths(IWebHostEnvironment env, IConfiguration config)
{
    public string Root { get; } = Path.GetFullPath(config["Taller:DataDirectory"] ?? Path.Combine(env.ContentRootPath, "App_Data"));
    public string Keys => Path.Combine(Root, "keys");
    public string Evidence => Path.Combine(Root, "evidence");
}
