import { withConnection } from "./db.service.js";

export const getFinishedOrders = async () => {
  return withConnection(async (conn) => {
    const [rows] = await conn.execute("CALL erp.sp_get_finished_orders()");
    return rows[0];
  });
};

export const getFinishedOrderItems = async () => {
  return withConnection(async (conn) => {
    const [rows] = await conn.execute("CALL erp.sp_get_finished_order_items()");
    return rows[0];
  });
};
