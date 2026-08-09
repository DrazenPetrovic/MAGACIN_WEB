import * as ArtikliService from '../services/artikli.service.js';

// GET /api/artikli
export const getArtikli = async (req, res) => {
  try {
    const data = await ArtikliService.getArtikli();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('getArtikli error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri dohvatanju artikala' });
  }
};

// GET /api/artikli/grupe
export const getArtikliGrupe = async (req, res) => {
  try {
    const data = await ArtikliService.getArtikliGrupe();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('getArtikliGrupe error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri dohvatanju grupa artikala' });
  }
};
