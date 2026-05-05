import * as LokalService from '../services/aktivneNarudzbeLokal.service.js';

// GET /api/narudzbe-lokalno
// Dohvata sve aktivne narudžbe (sp_get_active_orders) s njihovim stavkama (sp_get_active_order_items)
export const getNarudzbeLokalno = async (req, res) => {
  try {
    const orders = await LokalService.getActiveOrders();

    const ordersWithItems = await Promise.all(
      (orders || []).map(async (order) => {
        const items = order.id
          ? await LokalService.getActiveOrderItems(order.id)
          : [];

        // Ako je priprema pokrenuta (status_id >= 2) dohvati preparation podatke
        // i merguj ih u stavke po order_item_id
        let prepMap = new Map();
        if (order.status_id >= 2 && order.id) {
          const prep = await LokalService.getPreparationByOrderId(order.id);
          (prep || []).forEach((p) => prepMap.set(p.order_item_id, p));
        }

        const mergedItems = (items || []).map((item) => ({
          ...item,
          preparation: prepMap.get(item.id) ?? null,
        }));

        return { ...order, items: mergedItems };
      }),
    );

    return res.json({ success: true, data: ordersWithItems });
  } catch (error) {
    console.error('getNarudzbeLokalno error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri dohvatanju lokalnih narudžbi' });
  }
};

// POST /api/narudzbe-lokalno/pokreni-pripremu
// Inicijalizuje pripremu narudžbe — poziva sp_prepare_order
export const pokreniPripremu = async (req, res) => {
  try {
    const { order_id, prepared_by } = req.body;
    if (!order_id || !prepared_by) {
      return res.status(400).json({ success: false, message: 'order_id i prepared_by su obavezni' });
    }
    const out = await LokalService.prepareOrder(order_id, prepared_by);
    return res.json({ success: out.result === 1, message: out.message });
  } catch (error) {
    console.error('pokreniPripremu error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri pokretanju pripreme' });
  }
};

// POST /api/narudzbe-lokalno/azuriraj
// Dodaje pripremljenu količinu na stavku — poziva sp_add_prepared_quantity
export const azurirajLokalno = async (req, res) => {
  try {
    const { preparation_id, quantity_to_add, prepared_by, notes } = req.body;
    console.log('[azuriraj] body:', { preparation_id, quantity_to_add, prepared_by });
    if (!preparation_id || quantity_to_add === undefined || quantity_to_add === null || !prepared_by) {
      return res.status(400).json({
        success: false,
        message: 'preparation_id, quantity_to_add i prepared_by su obavezni',
      });
    }
    const out = await LokalService.addPreparedQuantity(preparation_id, quantity_to_add, prepared_by, notes ?? null);
    console.log('[azuriraj] SP result:', out);
    return res.json({ success: out.result === 1, message: out.message });
  } catch (error) {
    console.error('azurirajLokalno error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri ažuriranju' });
  }
};
