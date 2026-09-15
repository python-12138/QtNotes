using SqlSugar;

namespace QTNotes.Domain.Entities;

/// <summary>一顿饭的营养记录（饮食账本专用，独立表，不产生 Transaction）</summary>
[SugarTable("meals")]
public class Meal : EntityBase
{
    public string LedgerId { get; set; } = string.Empty;

    /// <summary>业务日期，'YYYY-MM-DD'</summary>
    public string Date { get; set; } = string.Empty;

    /// <summary>餐次：breakfast / lunch / dinner / snack</summary>
    public string MealType { get; set; } = "lunch";

    /// <summary>识别出的食物描述，如「米饭 + 红烧肉 + 青菜」</summary>
    [SugarColumn(Length = 255)]
    public string Summary { get; set; } = string.Empty;

    /// <summary>碳水（克）</summary>
    public double Carbs { get; set; }

    /// <summary>蛋白质（克）</summary>
    public double Protein { get; set; }

    /// <summary>脂肪（克）</summary>
    public double Fat { get; set; }

    /// <summary>热量（千卡）</summary>
    public double Kcal { get; set; }

    /// <summary>压缩缩略图 dataURL（仅回显，可能较长，用 longtext）</summary>
    [SugarColumn(ColumnDataType = "longtext", IsNullable = true)]
    public string? Image { get; set; }

    [SugarColumn(Length = 255)]
    public string Note { get; set; } = string.Empty;
}
