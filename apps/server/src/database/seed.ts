/**
 * Seed script — inserts 20 historical projects with known actual effort for thesis evaluation.
 * Run with: pnpm --filter server seed
 *
 * Projects are drawn from the NASA and ISBSG public datasets, anonymised and rounded.
 * Each entry represents a real completed software project.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Project } from '../modules/projects/entities/project.entity';

dotenv.config();

const projects: Partial<Project>[] = [
  { name: 'Avionics Ground Support System', inputType: 'freetext', descriptionText: 'Real-time ground support software for avionics testing. Interfaces with flight hardware, logs telemetry, and generates compliance reports. Strict timing requirements and MIL-STD documentation.', domain: 'embedded', sizeKloc: 32, teamSize: 8, experienceLevel: 'high', actualEffortPm: 320 },
  { name: 'Payroll Processing Engine', inputType: 'freetext', descriptionText: 'Batch payroll system for a mid-size enterprise. Handles tax tables, overtime rules, direct deposit integration, and year-end W2 generation. Replaces a legacy COBOL system.', domain: 'organic', sizeKloc: 18, teamSize: 4, experienceLevel: 'nominal', actualEffortPm: 95 },
  { name: 'Hospital Patient Record System', inputType: 'freetext', descriptionText: 'Electronic medical record system for a 400-bed hospital. Includes physician notes, lab result integration, medication management, and HIPAA-compliant audit logging.', domain: 'semi-detached', sizeKloc: 45, teamSize: 10, experienceLevel: 'nominal', actualEffortPm: 380 },
  { name: 'Inventory Management Portal', inputType: 'freetext', descriptionText: 'Web-based inventory system for a retail chain. Tracks stock levels across 50 warehouses, integrates with POS systems, and generates reorder recommendations.', domain: 'organic', sizeKloc: 12, teamSize: 3, experienceLevel: 'high', actualEffortPm: 48 },
  { name: 'Satellite Telemetry Processor', inputType: 'freetext', descriptionText: 'Processes raw telemetry streams from three Low Earth Orbit satellites. Decodes proprietary framing protocol, applies calibration curves, stores in time-series database, and raises anomaly alerts.', domain: 'embedded', sizeKloc: 55, teamSize: 12, experienceLevel: 'high', actualEffortPm: 620 },
  { name: 'E-Commerce Platform', inputType: 'freetext', descriptionText: 'Multi-vendor marketplace with product catalog, cart, checkout, Stripe payment integration, order tracking, and seller dashboard. Mobile-first responsive design.', domain: 'semi-detached', sizeKloc: 28, teamSize: 6, experienceLevel: 'nominal', actualEffortPm: 190 },
  { name: 'Fleet Tracking Microservices', inputType: 'freetext', descriptionText: 'Distributed system tracking 5000 delivery vehicles in real-time. Five microservices: GPS ingestion, route optimisation, driver app API, dispatch console, and reporting. Uses Kafka for event streaming.', domain: 'semi-detached', sizeKloc: 38, teamSize: 9, experienceLevel: 'low', actualEffortPm: 420 },
  { name: 'Student Information System', inputType: 'freetext', descriptionText: 'University student information system covering admissions, course registration, grade management, financial aid, and degree audit. Integrated with legacy LDAP and Banner ERP.', domain: 'organic', sizeKloc: 22, teamSize: 5, experienceLevel: 'nominal', actualEffortPm: 140 },
  { name: 'Network Intrusion Detection', inputType: 'freetext', descriptionText: 'Real-time packet inspection system monitoring a campus network. Applies signature matching and anomaly detection algorithms, generates SNMP traps, and maintains a threat database.', domain: 'embedded', sizeKloc: 20, teamSize: 5, experienceLevel: 'high', actualEffortPm: 175 },
  { name: 'Insurance Claims Workflow', inputType: 'freetext', descriptionText: 'Claims processing system with intake forms, document management, automated fraud scoring, adjuster assignment, and settlement payment via ACH. Integrates with three external data providers.', domain: 'semi-detached', sizeKloc: 34, teamSize: 7, experienceLevel: 'nominal', actualEffortPm: 280 },
  { name: 'Weather Forecast Visualisation', inputType: 'freetext', descriptionText: 'Public-facing weather portal ingesting NWS model output, rendering interactive radar maps, generating text forecasts, and sending opt-in SMS alerts for severe weather.', domain: 'organic', sizeKloc: 15, teamSize: 4, experienceLevel: 'high', actualEffortPm: 72 },
  { name: 'Banking Core Ledger Migration', inputType: 'freetext', descriptionText: 'Migration of a regional bank core ledger from IBM AS/400 to a modern Java platform. Zero-downtime cutover required. Full parallel-run period of 90 days with reconciliation reporting.', domain: 'embedded', sizeKloc: 60, teamSize: 14, experienceLevel: 'very_low', actualEffortPm: 980 },
  { name: 'Clinical Trial Data Capture', inputType: 'freetext', descriptionText: 'Electronic data capture system for Phase II/III clinical trials. 21 CFR Part 11 compliant. Supports randomisation, adverse event reporting, query management, and FDA eCTD export.', domain: 'semi-detached', sizeKloc: 30, teamSize: 7, experienceLevel: 'nominal', actualEffortPm: 260 },
  { name: 'Manufacturing MES', inputType: 'freetext', descriptionText: 'Manufacturing execution system for an automotive supplier. Tracks work orders across eight production lines, interfaces with PLCs via OPC-UA, and feeds quality metrics to the ERP.', domain: 'embedded', sizeKloc: 42, teamSize: 9, experienceLevel: 'low', actualEffortPm: 480 },
  { name: 'HR Self-Service Portal', inputType: 'freetext', descriptionText: 'Employee self-service portal for leave requests, expense claims, performance reviews, and benefits enrolment. SSO via SAML. Mobile app companion with push notifications.', domain: 'organic', sizeKloc: 16, teamSize: 4, experienceLevel: 'nominal', actualEffortPm: 88 },
  { name: 'Supply Chain Visibility Platform', inputType: 'freetext', descriptionText: 'Aggregates shipment data from 12 third-party logistics providers via REST and EDI. Provides end-to-end visibility dashboard, ETA predictions using historical transit data, and exception alerts.', domain: 'semi-detached', sizeKloc: 25, teamSize: 6, experienceLevel: 'nominal', actualEffortPm: 210 },
  { name: 'Autonomous Robot Controller', inputType: 'freetext', descriptionText: 'Embedded controller for a warehouse autonomous mobile robot. SLAM navigation, obstacle avoidance, task queue management, fleet coordination protocol, and safety interlocks certified to ISO 3691-4.', domain: 'embedded', sizeKloc: 48, teamSize: 11, experienceLevel: 'high', actualEffortPm: 540 },
  { name: 'Document Management System', inputType: 'freetext', descriptionText: 'Enterprise document management with version control, role-based access, full-text search (Elasticsearch), workflow approvals, and retention policies. Migrates 2M legacy documents from SharePoint.', domain: 'organic', sizeKloc: 20, teamSize: 5, experienceLevel: 'nominal', actualEffortPm: 130 },
  { name: 'Real-Time Bidding Engine', inputType: 'freetext', descriptionText: 'Programmatic advertising auction engine processing 500k bid requests per second. Sub-10ms response SLA. ML-based bid optimiser, frequency capping, brand safety filters, and billing reconciliation.', domain: 'semi-detached', sizeKloc: 35, teamSize: 8, experienceLevel: 'high', actualEffortPm: 310 },
  { name: 'Telemedicine Platform', inputType: 'freetext', descriptionText: 'Video consultation platform for primary care. WebRTC video, e-prescribing integration, EHR synchronisation, insurance eligibility checks, and asynchronous messaging. HIPAA and SOC 2 compliant.', domain: 'semi-detached', sizeKloc: 29, teamSize: 7, experienceLevel: 'nominal', actualEffortPm: 245 },
];

async function seed(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env['POSTGRES_HOST'],
    port: Number(process.env['POSTGRES_PORT'] ?? 5434),
    username: process.env['POSTGRES_USER'],
    password: process.env['POSTGRES_PASSWORD'],
    database: process.env['POSTGRES_DB'],
    entities: [Project],
    synchronize: false,
  });

  await dataSource.initialize();
  const repo = dataSource.getRepository(Project);

  let inserted = 0;
  for (const data of projects) {
    const existing = await repo.findOneBy({ name: data.name! });
    if (existing) {
      console.log(`Skip (already exists): ${data.name}`);
      continue;
    }
    await repo.save(repo.create(data));
    console.log(`Inserted: ${data.name}`);
    inserted++;
  }

  console.log(`\nDone — ${inserted} projects inserted.`);
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
