using SqlSugar;

namespace QTNotes.Domain.Entities;

/// <summary>账户（支付账户）</summary>
[SugarTable("accounts")]
public class Account : EntityBase
{
    public string LedgerId { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    /// <summary>图标（emoji）</summary>
    public string Icon { get; set; } = string.Empty;
}
