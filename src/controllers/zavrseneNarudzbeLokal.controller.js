import * as Service from '../services/zavrseneNarudzbeLokal.service.js';

// GET /api/zavrsene-narudzbe-lokal
export const getFinishedOrdersLokal = async (req, res) => {
  try {
    const [orders, items] = await Promise.all([
      Service.getFinishedOrders(),
      Service.getFinishedOrderItems(),
    ]);

    const itemsMap = new Map();
    (items || []).forEach((item) => {
      if (!itemsMap.has(item.order_id)) itemsMap.set(item.order_id, []);
      itemsMap.get(item.order_id).push(item);
    });

    const result = (orders || []).map((order) => ({
      ...order,
      items: itemsMap.get(order.id) ?? [],
    }));

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('getFinishedOrdersLokal error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri dohvatanju završenih narudžbi BL' });
  }
};
