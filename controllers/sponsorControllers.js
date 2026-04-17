// controllers/sponsorController.js

const pool = require("../config/db");

const createSponsor = async (req, res) => {
  try {
    const { name, email, phone, company, amount } = req.body;

    // ✅ validation
    if (!name) {
      return res.status(400).json({
        message: "Name is required"
      });
    }

    // 🧠 SQL query
    const query = `
      INSERT INTO sponsors (name, email, phone, company, amount, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *;
    `;

    const values = [name, email, phone, company, amount || 0];

    const result = await pool.query(query, values);

    return res.status(201).json({
      message: "Sponsor created successfully",
      sponsor: result.rows[0]
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// GET /sponsors
const getSponsors = async (req, res) => {
  try {
    const query = `
      SELECT *
      FROM sponsors
      ORDER BY created_at DESC;
    `;

    const result = await pool.query(query);

    return res.status(200).json({
      message: "Sponsors fetched successfully",
      count: result.rows.length,
      sponsors: result.rows
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};


// PUT /sponsors/:id
const updateSponsor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, company, amount } = req.body;

    // ✅ check if sponsor exists
    const checkQuery = `SELECT * FROM sponsors WHERE id = $1`;
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        message: "Sponsor not found"
      });
    }

    // 🧠 update query
    const query = `
      UPDATE sponsors
      SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        company = COALESCE($4, company),
        amount = COALESCE($5, amount)
      WHERE id = $6
      RETURNING *;
    `;

    const values = [
      name || null,
      email || null,
      phone || null,
      company || null,
      amount || null,
      id
    ];

    const result = await pool.query(query, values);

    return res.status(200).json({
      message: "Sponsor updated successfully",
      sponsor: result.rows[0]
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// DELETE /sponsors/:id
const deleteSponsor = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ check if sponsor exists
    const checkQuery = `SELECT * FROM sponsors WHERE id = $1`;
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        message: "Sponsor not found"
      });
    }

    // 🗑️ delete sponsor
    const deleteQuery = `
      DELETE FROM sponsors
      WHERE id = $1
      RETURNING *;
    `;

    const result = await pool.query(deleteQuery, [id]);

    return res.status(200).json({
      message: "Sponsor deleted successfully",
      deletedSponsor: result.rows[0]
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

module.exports = {
  createSponsor,getSponsors,updateSponsor,deleteSponsor
};