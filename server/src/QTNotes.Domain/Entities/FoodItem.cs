using SqlSugar;

namespace QTNotes.Domain.Entities;

/// <summary>食物菜单项（饮食账本专用，识别过的食物按每 100g 营养沉淀，独立表，不产生 Transaction）</summary>
[SugarTable("fooditems")]
public class FoodItem : EntityBase
{
    public string LedgerId { get; set; } = string.Empty;

    /// <summary>食物名，如「米饭」</summary>
    [SugarColumn(Length = 255)]
    public string Name { get; set; } = string.Empty;

    /// <summary>每 100g 热量（千卡）</summary>
    public double KcalPer100g { get; set; }

    /// <summary>每 100g 碳水（克）</summary>
    public double CarbsPer100g { get; set; }

    /// <summary>每 100g 蛋白质（克）</summary>
    public double ProteinPer100g { get; set; }

    /// <summary>每 100g 脂肪（克）</summary>
    public double FatPer100g { get; set; }
}
