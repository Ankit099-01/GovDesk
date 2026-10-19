import { OfficeLocation } from '../models/OfficeLocation.js';

export const getOffices = async (req, res) => {
  try {
    const { city, state, type, search } = req.query;
    let query = {};

    if (city && city !== 'all') {
      query.city = new RegExp(`^${city.trim()}$`, 'i');
    }

    if (state && state !== 'all') {
      query.state = new RegExp(`^${state.trim()}$`, 'i');
    }

    if (type && type !== 'all') {
      query.type = new RegExp(type.trim(), 'i');
    }

    let offices = await OfficeLocation.find(query);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      offices = offices.filter(o => 
        (o.name || '').toLowerCase().includes(q) ||
        (o.address || '').toLowerCase().includes(q) ||
        (o.city || '').toLowerCase().includes(q) ||
        (o.state || '').toLowerCase().includes(q) ||
        (o.pincode || '').includes(q) ||
        (o.type || '').toLowerCase().includes(q) ||
        (o.services_handled && o.services_handled.some(s => s.toLowerCase().includes(q)))
      );
    }

    // Get distinct states, cities (filtered by state if selected), and office types
    const allStates = await OfficeLocation.distinct('state');
    
    let cityQuery = {};
    if (state && state !== 'all') {
      cityQuery.state = new RegExp(`^${state.trim()}$`, 'i');
    }
    const availableCities = await OfficeLocation.distinct('city', cityQuery);
    const allTypes = await OfficeLocation.distinct('type');

    return res.json({
      success: true,
      total: offices.length,
      available_states: allStates.sort(),
      available_cities: availableCities.sort(),
      available_types: allTypes.sort(),
      offices
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch office locations: ' + err.message });
  }
};

export const getOfficeById = async (req, res) => {
  try {
    const { id } = req.params;
    const office = await OfficeLocation.findOne({ id });
    if (!office) {
      return res.status(404).json({ success: false, message: 'Office location not found.' });
    }
    return res.json({ success: true, office });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve office.' });
  }
};
