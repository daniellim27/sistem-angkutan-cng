const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const NotaBesarItem = sequelize.define("NotaBesarItem", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    nota_besar_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'nota_besars',
        key: 'id'
      },
      comment: 'Reference to nota besar'
    },
    nota_kecil_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'nota_kecils',
        key: 'id'
      },
      comment: 'Reference to nota kecil'
    },
    volume_m3: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      comment: 'Volume in m³ for this item (calculated using billing formula)'
    },
    price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Price for this item (volume_m3 * gas_price_per_m3)'
    }
  }, {
    tableName: "nota_besar_items",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["nota_besar_id"]
      },
      {
        fields: ["nota_kecil_id"]
      },
      {
        unique: true,
        fields: ["nota_besar_id", "nota_kecil_id"],
        name: "unique_nota_besar_item"
      }
    ]
  });

  return NotaBesarItem;
};
