import { withConnection } from "./db.service.js";

export const getActiveOrders = async () => {
  return withConnection(async (conn) => {
    const [rows] = await conn.execute("CALL erp.sp_get_active_orders()");
    return rows[0];
  });
};

export const getActiveOrderItems = async (orderId) => {
  return withConnection(async (conn) => {
    const [rows] = await conn.execute("CALL erp.sp_get_active_order_items(?)", [
      Number(orderId),
    ]);
    return rows[0];
  });
};

export const getPreparationByOrderId = async (orderId) => {
  return withConnection(async (conn) => {
    const [rows] = await conn.execute(
      `SELECT id, order_item_id, ordered_quantity, prepared_quantity,
              remaining_quantity, order_status, preparation_notes
       FROM erp.trade_orders_preparation
       WHERE order_id = ?`,
      [Number(orderId)],
    );
    return rows;
  });
};

export const addPreparedQuantity = async (preparationId, preparedQuantity, preparedBy, notes, force = 0) => {
  return withConnection(async (conn) => {
    await conn.query(
      "CALL erp.sp_prepare_order(?, ?, ?, ?, ?, @p_result, @p_message)",
      [Number(preparationId), Number(preparedQuantity), Number(preparedBy), notes ?? null, force],
    );
    const [[out]] = await conn.query(
      "SELECT @p_result AS result, @p_message AS message",
    );
    return { result: out.result, message: out.message };
  });
};

export const prepareOrder = async (orderId, preparedBy) => {
  return withConnection(async (conn) => {
    const id = Number(orderId);
    const by = Number(preparedBy);

    // Provjera da li priprema već postoji
    const [[{ cnt }]] = await conn.query(
      "SELECT COUNT(*) AS cnt FROM erp.trade_orders_preparation WHERE order_id = ?",
      [id],
    );
    if (cnt > 0) {
      return { result: 0, message: "Priprema za ovu narudžbu već postoji" };
    }

    // Dohvat stavki
    const [items] = await conn.query(
      `SELECT i.id, i.product_id, i.product_name, i.product_uom, i.quantity,
              o.order_number
       FROM erp.trade_order_items i
       INNER JOIN erp.trade_orders o ON o.id = i.order_id
       WHERE i.order_id = ?`,
      [id],
    );
    if (!items.length) {
      return { result: 0, message: "Narudžba nema stavki" };
    }

    await conn.beginTransaction();
    try {
      for (const item of items) {
        await conn.query(
          `INSERT INTO erp.trade_orders_preparation
             (order_id, order_item_id, referent_number, product_id, product_name,
              product_uom, ordered_quantity, prepared_quantity, remaining_quantity,
              prepared_by, preparation_notes, order_status, prepared_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0.0000, ?, ?, NULL, 'pending', NULL, NOW())`,
          [
            id,
            item.id,
            `${item.order_number}-${item.id}`,
            item.product_id,
            item.product_name,
            item.product_uom,
            item.quantity,
            item.quantity, // remaining = ordered na početku
            by,
          ],
        );
      }
      await conn.query(
        "UPDATE erp.trade_orders SET status_id = 2 WHERE id = ?",
        [id],
      );
      await conn.commit();
      return { result: 1, message: `Priprema kreirana — ukupno stavki: ${items.length}` };
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  });
};
