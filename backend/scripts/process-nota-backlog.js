#!/usr/bin/env node

/**
 * Utility script to reconcile pending Nota Kecil batches for all sessions.
 * Useful when deploying the buffered Nota Kecil feature to process existing captures.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../src/models');
const cctvScheduler = require('../src/services/cctvScheduler');

async function main() {
  try {
    console.log('🔄 Processing pending Nota Kecil batches for all sessions...');
    await db.sequelize.authenticate();

    const sessions = await db.CCTVSession.findAll({
      where: {},
      order: [['id', 'ASC']],
    });

    if (sessions.length === 0) {
      console.log('ℹ️  No sessions found.');
      return;
    }

    for (const session of sessions) {
      console.log(`\n➡️  Session ${session.id} (${session.customer_name}) - status: ${session.status}`);
      await cctvScheduler.processPendingNotaBatches(session);
    }

    console.log('\n✅ Pending Nota Kecil batches processed successfully!');
  } catch (error) {
    console.error('\n❌ Failed to process Nota Kecil backlog:', error);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = main;

