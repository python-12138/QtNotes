using SqlSugar;

namespace QTNotes.Domain.Entities;

/// <summary>分类</summary>
[SugarTable("categories")]
public class Category : EntityBase
{
    public string LedgerId { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    /// <summary>收支类型：income / expense</summary>
    public string Type { get; set; } = "expense";

    public string Icon { get; set; } = string.Empty;

    public string Color { get; set; } = string.Empty;

    public bool IsDefault { get; set; }

    /// <summary>系统保护：禁止删除（对应手机端 protected 字段）</summary>
    [SugarColumn(IsNullable = true)]
    public bool? Protected { get; set; }

    /// <summary>是否「油费」分类（触发油耗计算）</summary>
    [SugarColumn(IsNullable = true)]
    public bool? IsFuel { get; set; }
}
