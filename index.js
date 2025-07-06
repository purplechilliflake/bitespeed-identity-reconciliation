require('dotenv').config();
const express = require('express');
const pool = require('./db');
const app = express();

app.use(express.json()); // For parsing application/json

app.post('/identify', async (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: 'Provide at least email or phoneNumber' });
  }

  try {
    const client = await pool.connect();

    // 1) Find identities matching the given email or phone number
    const existingIdentitiesQuery = `
      SELECT * FROM identities
      WHERE (email IS NOT NULL AND email = $1)
         OR (phonenumber IS NOT NULL AND phonenumber = $2)
    `;
    const existing = await client.query(existingIdentitiesQuery, [email, phoneNumber]);
    const identities = existing.rows;

    let primary = null;

    if (identities.length === 0) {
      // 2) No match found, create new identity as primary
      const insertQuery = `
        INSERT INTO identities (email, phonenumber)
        VALUES ($1, $2) RETURNING *
      `;
      const newIdentity = await client.query(insertQuery, [email, phoneNumber]);
      await client.release();

      return res.json({
        contact: {
          primaryContatctId: newIdentity.rows[0].id,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: [],
        }
      });
    }

    // 3) Determine primary by smallest id among all matching identities
    primary = identities.reduce((min, curr) => (curr.id < min.id ? curr : min), identities[0]);

    // 4) Update all matching identities to link to the primary
    for (const identity of identities) {
      if (identity.id !== primary.id && identity.linkedid !== primary.id) {
        await client.query(
          `UPDATE identities SET linkedid = $1 WHERE id = $2`,
          [primary.id, identity.id]
        );
      }
    }

    // 5) Fetch the **full group** of identities: primary + secondaries linked to it
    const groupQuery = `
      SELECT * FROM identities
      WHERE id = $1 OR linkedid = $1
    `;
    let groupResult = await client.query(groupQuery, [primary.id]);
    let group = groupResult.rows;

    // 6) Determine if new info was provided
    const existingEmails = new Set(group.map(i => i.email).filter(e => e));
    const existingPhones = new Set(group.map(i => i.phonenumber).filter(p => p));

    if ((email && !existingEmails.has(email)) || (phoneNumber && !existingPhones.has(phoneNumber))) {
      // New info → insert new identity linked to primary
      await client.query(
        `INSERT INTO identities (email, phonenumber, linkedid)
        VALUES ($1, $2, $3) RETURNING *`,
        [email, phoneNumber, primary.id]
      );

      // Fetch full updated group to include the newly added identity
      groupResult = await client.query(groupQuery, [primary.id]);
      group = groupResult.rows;
    }

    console.log('Final group before building response:', group);

    const allEmails = Array.from(
      new Set(group.map(i => i.email).filter(e => e !== null && e !== undefined))
    );
    const allPhones = Array.from(
      new Set(group.map(i => i.phonenumber).filter(p => p !== null && p !== undefined))
    );

    console.log('Collected emails:', allEmails);
    console.log('Collected phoneNumbers:', allPhones);

    const secondaryIds = group
      .filter(i => i.id !== primary.id)
      .map(i => i.id);

    await client.release();

    return res.json({
      contact: {
        primaryContatctId: primary.id,
        emails: allEmails,
        phoneNumbers: allPhones,
        secondaryContactIds: secondaryIds
      }
    });
  } catch (err) {
    console.error('Error in /identify:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
