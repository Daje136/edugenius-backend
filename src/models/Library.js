const pool = require('../config/postgres');

const Library = {
  async create(doc) {
    const { category, ...rest } = doc;

    const { rows } = await pool.query(
      `INSERT INTO library_resources
       (category, data)
       VALUES ($1, $2)
       RETURNING id`,
      [category, JSON.stringify(rest)]
    );

    return {
      ...doc,
      _id: rows[0].id,
    };
  },

  async find(filters = {}) {
    let query =
      'SELECT id, category, data, created_at FROM library_resources';

    const values = [];

    if (filters.category) {
      query += ' WHERE category = $1';
      values.push(filters.category);
    }

    query += ' ORDER BY id';

    const { rows } = await pool.query(query, values);

    return rows.map(r => ({
      ...r.data,
      _id: r.id,
      category: r.category,
    }));
  },

  async deleteMany() {
    await pool.query('DELETE FROM library_resources');
  },
};

module.exports = Library;