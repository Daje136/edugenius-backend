'use strict';
const pool = require('../../config/postgres');

const Question = {

  async find(filters = {}, opts = {}) {
    const conditions = [];
    const values = [];
    let i = 1;

    if (filters.examType)   { conditions.push(`exam_type = $${i++}`);        values.push(filters.examType); }
    if (filters.subject)    { conditions.push(`subject ILIKE $${i++}`);      values.push(`%${filters.subject}%`); }
    if (filters.topic)      { conditions.push(`topic ILIKE $${i++}`);        values.push(`%${filters.topic}%`); }
    if (filters.year)       { conditions.push(`year = $${i++}`);             values.push(parseInt(filters.year)); }
    if (filters.difficulty) { conditions.push(`difficulty = $${i++}`);      values.push(parseInt(filters.difficulty)); }
    if (filters.type)       { conditions.push(`type = $${i++}`);             values.push(filters.type); }
    if (filters.class_level){ conditions.push(`class_level = $${i++}`);     values.push(filters.class_level); }

    if (filters._id?.$in && filters._id.$in.length) {
      const placeholders = filters._id.$in.map(() => `$${i++}`).join(', ');
      conditions.push(`id IN (${placeholders})`);
      values.push(...filters._id.$in);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = opts.limit ? `LIMIT ${parseInt(opts.limit)}` : '';
    const order = `ORDER BY year DESC NULLS LAST, id`;

    const { rows } = await pool.query(
      `SELECT id, exam_type, curriculum, subject, topic, year, type,
              difficulty, approved, body, options, answer_index,
              worked_solution, formulas_used, common_mistakes, tags,
              class_level, created_at
       FROM questions ${where} ${order} ${limit}`,
      values
    );

    return rows.map(r => _format(r, opts.exclude));
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT id, exam_type, curriculum, subject, topic, year, type,
              difficulty, approved, body, options, answer_index,
              worked_solution, formulas_used, common_mistakes, tags,
              class_level, created_at
       FROM questions WHERE id = $1`,
      [id]
    );
    return rows.length ? _format(rows[0]) : null;
  },

  async incrementStats(id, isCorrect) {
    return; // no stats columns — skip silently
  },

  async create(doc) {
    const {
      subject, exam_type, class_level, curriculum,
      topic, year, type, difficulty, approved,
      body, options, answer_index, worked_solution,
      formulas_used, common_mistakes, tags,
    } = doc;

    const { rows } = await pool.query(
      `INSERT INTO questions
        (subject, exam_type, class_level, curriculum, topic, year, type,
         difficulty, approved, body, options, answer_index, worked_solution,
         formulas_used, common_mistakes, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING id`,
      [
        subject, exam_type, class_level || 'SS3', curriculum || 'NG',
        topic || null, year || null, type || 'MCQ',
        difficulty || 1, approved !== undefined ? approved : true,
        body, JSON.stringify(options || []),
        answer_index, worked_solution || null,
        JSON.stringify(formulas_used || []),
        common_mistakes || null,
        JSON.stringify(tags || []),
      ]
    );
    return { ...doc, _id: rows[0].id };
  },

  async insertMany(docs) {
    const results = [];
    for (const doc of docs) results.push(await Question.create(doc));
    return results;
  },

  async deleteMany() {
    await pool.query('DELETE FROM questions');
  },

  async countDocuments(filters = {}) {
    return (await Question.find(filters)).length;
  },
};

function _format(r, exclude = []) {
  const excluded = new Set(exclude || []);
  const result = {
    _id:             r.id,
    subject:         r.subject,
    exam_type:       r.exam_type,
    class_level:     r.class_level,
    curriculum:      r.curriculum,
    topic:           r.topic,
    year:            r.year,
    type:            r.type,
    difficulty:      r.difficulty,
    approved:        r.approved,
    body:            r.body,
    options:         r.options,
    answerIndex:     r.answer_index,
    worked_solution: excluded.has('worked_solution') ? undefined : r.worked_solution,
    formulas_used:   r.formulas_used,
    common_mistakes: excluded.has('common_mistakes') ? undefined : r.common_mistakes,
    tags:            r.tags,
    createdAt:       r.created_at,
  };
  return result;
}

module.exports = Question;