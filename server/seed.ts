/**
 * Seed Mofawtar with realistic Q2 2026 data.
 * Run via: npm run db:seed
 */
import bcrypt from "bcryptjs";
import { db, pool } from "./db";
import {
  roles,
  users,
  campaigns,
  adSets,
  ads,
  metaDailyPerformance,
  prospects,
  leadStages,
  leadStatuses,
  lostReasons,
  products,
  channels,
  activityTypes,
  deals,
  activities,
  tasks,
  customFields,
  kpiDefinitions,
  scoringRules,
  slaRules,
  auditLogs,
} from "../shared/schema";
import {
  ADMIN_PERMISSIONS,
  SALES_PERMISSIONS,
  MEDIA_PERMISSIONS,
  ROLES,
} from "../shared/permissions";
import { yearMonth, isoWeek, yearQuarter } from "../shared/calculations";
import { sql } from "drizzle-orm";

const RNG_SEED = 42;
let rngState = RNG_SEED;
function rand() {
  // mulberry32
  rngState = (rngState + 0x6d2b79f5) | 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const ri = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

const FIRST_NAMES = [
  "Ahmed", "Mohamed", "Mahmoud", "Khaled", "Omar", "Youssef", "Hassan", "Karim",
  "Tarek", "Hossam", "Sherif", "Ali", "Mostafa", "Amr", "Sameh", "Walid",
  "Fatma", "Aya", "Hala", "Mariam", "Nada", "Salma", "Sara", "Yasmin",
  "Heba", "Dina", "Nour", "Rana", "Reem", "Rasha", "Manal", "Eman",
];
const LAST_NAMES = [
  "Hassan", "Salah", "Ibrahim", "Sayed", "Mahmoud", "Abdelaziz", "El Sayed",
  "Fawzy", "El Masry", "Saad", "Helmy", "Naguib", "Anwar", "Farouk", "Zaki",
  "Shokry", "Younis", "Bakr", "Ezzat", "Ramadan",
];
const COMPANIES = [
  "Nile Tech Group", "Cairo Logistics", "Alexandria Foods Co.", "Pyramid Capital",
  "Delta Pharma", "Red Sea Hotels", "Sinai Industries", "Misr Electronics",
  "Sunshine Real Estate", "Oasis Tours", "Atlas Engineering", "Cairo Medical Center",
  "GreenWay Agritech", "BlueWave Marine", "Falcon Security", "Cleopatra Cosmetics",
];
const INDUSTRIES = ["Retail", "Healthcare", "Education", "Real Estate", "Tourism", "Food & Beverage", "Tech / SaaS", "Logistics", "Finance", "Manufacturing"];
const CITIES = ["Cairo", "Giza", "Alexandria", "Mansoura", "Tanta", "Aswan", "Luxor", "Hurghada", "Sharm El Sheikh", "Port Said"];

async function clearAll() {
  await db.execute(sql`TRUNCATE TABLE
    audit_logs, custom_field_values, custom_fields, sla_rules, scoring_rules, kpi_definitions,
    activities, tasks, deals, prospects, meta_daily_performance, ads, ad_sets, campaigns,
    products, lost_reasons, lead_statuses, lead_stages, channels, activity_types,
    imports, users, roles, session
    RESTART IDENTITY CASCADE`);
}

async function seedRolesAndUsers() {
  const [adminRole] = await db
    .insert(roles)
    .values([
      { name: ROLES.ADMIN, description: "Full access to all features and data", permissionsJson: [...ADMIN_PERMISSIONS] },
      { name: ROLES.SALES, description: "Manages assigned leads, deals, activities; sees own pipeline & reports", permissionsJson: [...SALES_PERMISSIONS] },
      { name: ROLES.MEDIA, description: "Manages campaigns, ad sets, ads, Meta imports, and ROAS reports", permissionsJson: [...MEDIA_PERMISSIONS] },
    ])
    .returning();

  const [, salesRole, mediaRole] = await db.select().from(roles);
  const hash = (p: string) => bcrypt.hash(p, 10);

  const seedUsers = [
    { name: "Mofawtar Admin",         email: "admin@mofawtar.com",         password: "Admin123456",  role: adminRole.id, team: "Operations" },
    { name: "Sara Hassan (Sales)",    email: "sales@mofawtar.com",         password: "Sales123456",  role: salesRole.id, team: "Sales" },
    { name: "Karim Media (Buyer)",    email: "media@mofawtar.com",         password: "Media123456",  role: mediaRole.id, team: "Marketing" },
    { name: "Mariam Ali",             email: "mariam.ali@mofawtar.com",    password: "Sales123456",  role: salesRole.id, team: "Sales" },
    { name: "Omar Tarek",             email: "omar.tarek@mofawtar.com",    password: "Sales123456",  role: salesRole.id, team: "Sales" },
    { name: "Heba Mostafa",           email: "heba.mostafa@mofawtar.com",  password: "Sales123456",  role: salesRole.id, team: "Sales" },
    { name: "Nour Adel",              email: "nour.adel@mofawtar.com",     password: "Media123456",  role: mediaRole.id, team: "Marketing" },
  ];

  const inserted: any[] = [];
  for (const u of seedUsers) {
    const r = await db
      .insert(users)
      .values({ name: u.name, email: u.email, passwordHash: await hash(u.password), roleId: u.role, team: u.team, status: "active" })
      .returning();
    inserted.push(r[0]);
  }
  return inserted;
}

async function seedLookups() {
  const stages = await db
    .insert(leadStages)
    .values([
      { stageName: "Prospect",         stageOrder: 1,  stageType: "active", isSystemDefault: true },
      { stageName: "Lead",             stageOrder: 2,  stageType: "active", isSystemDefault: true },
      { stageName: "Contacted",        stageOrder: 3,  stageType: "active", isSystemDefault: true },
      { stageName: "Qualified (MQL)",  stageOrder: 4,  stageType: "active", isSystemDefault: true },
      { stageName: "SQL",              stageOrder: 5,  stageType: "active", isSystemDefault: true },
      { stageName: "Demo Scheduled",   stageOrder: 6,  stageType: "active", isSystemDefault: true },
      { stageName: "Proposal",         stageOrder: 7,  stageType: "active", isSystemDefault: true },
      { stageName: "Quote Sent",       stageOrder: 8,  stageType: "active", isSystemDefault: true },
      { stageName: "Negotiation",      stageOrder: 9,  stageType: "active", isSystemDefault: true },
      { stageName: "Nurture",          stageOrder: 10, stageType: "active", isSystemDefault: true },
      { stageName: "Won",              stageOrder: 11, stageType: "won",    isSystemDefault: true },
      { stageName: "Lost",             stageOrder: 12, stageType: "lost",   isSystemDefault: true },
    ])
    .returning();

  await db.insert(leadStatuses).values([
    { statusName: "New" },
    { statusName: "Working" },
    { statusName: "On Hold" },
    { statusName: "Nurture" },
    { statusName: "Converted" },
    { statusName: "Disqualified" },
  ]);

  await db.insert(lostReasons).values([
    { reasonName: "Price too high" },
    { reasonName: "Chose competitor" },
    { reasonName: "No budget" },
    { reasonName: "Bad timing" },
    { reasonName: "No response" },
    { reasonName: "Not a fit" },
    { reasonName: "Duplicate" },
  ]);

  await db.insert(channels).values([
    { channelName: "Meta Ads (Facebook)" },
    { channelName: "Meta Ads (Instagram)" },
    { channelName: "WhatsApp" },
    { channelName: "Messenger" },
    { channelName: "Website Form" },
    { channelName: "Phone Call" },
    { channelName: "Walk-in" },
    { channelName: "Referral" },
  ]);

  await db.insert(activityTypes).values([
    { typeName: "Call" },
    { typeName: "WhatsApp Message" },
    { typeName: "Email" },
    { typeName: "Meeting (Online)" },
    { typeName: "Meeting (In-person)" },
    { typeName: "Demo" },
    { typeName: "Proposal Sent" },
    { typeName: "Note" },
  ]);

  const products_ = await db
    .insert(products)
    .values([
      { productName: "Mofawtar Starter",      productCategory: "SaaS", price: "499.00",  billingCycle: "monthly" },
      { productName: "Mofawtar Pro",          productCategory: "SaaS", price: "1499.00", billingCycle: "monthly" },
      { productName: "Mofawtar Enterprise",   productCategory: "SaaS", price: "4999.00", billingCycle: "monthly" },
      { productName: "Mofawtar Onboarding",   productCategory: "Service", price: "2500.00", billingCycle: "one-time" },
      { productName: "Mofawtar Consulting",   productCategory: "Service", price: "750.00", billingCycle: "hourly" },
    ])
    .returning();

  return { stages, products: products_ };
}

async function seedSettings() {
  await db.insert(kpiDefinitions).values([
    { kpiKey: "roas",      kpiName: "ROAS",                 description: "Revenue / Spend",       formula: "revenue / spend",  entityLevel: "campaign", formatType: "ratio" },
    { kpiKey: "cpl",       kpiName: "Cost per Lead",        description: "Spend / CRM Leads",     formula: "spend / leads",    entityLevel: "campaign", formatType: "currency" },
    { kpiKey: "cac",       kpiName: "Customer Acquisition Cost", description: "Spend / Won Deals", formula: "spend / wonDeals", entityLevel: "campaign", formatType: "currency" },
    { kpiKey: "cpc",       kpiName: "Cost per Click",       description: "Spend / Clicks",        formula: "spend / clicks",   entityLevel: "ad",       formatType: "currency" },
    { kpiKey: "ctr",       kpiName: "CTR",                  description: "Clicks / Impressions",  formula: "clicks / impressions", entityLevel: "ad",   formatType: "percent" },
    { kpiKey: "winRate",   kpiName: "Win Rate",             description: "Won / Total Deals",     formula: "won / total",      entityLevel: "user",     formatType: "percent" },
    { kpiKey: "avgDeal",   kpiName: "Average Deal Size",    description: "Revenue / Won Deals",   formula: "revenue / won",    entityLevel: "user",     formatType: "currency" },
    { kpiKey: "leadToWon", kpiName: "Lead → Won Rate",      description: "Won / Leads",           formula: "won / leads",      entityLevel: "campaign", formatType: "percent" },
  ]);

  await db.insert(scoringRules).values([
    { ruleName: "From Meta Ads", entityType: "prospect", scoreValue: 10, conditionJson: { channel: ["Meta Ads (Facebook)", "Meta Ads (Instagram)"] } as any },
    { ruleName: "Replied within 1h", entityType: "prospect", scoreValue: 15, conditionJson: { firstReplyMinutes: { lte: 60 } } as any },
    { ruleName: "Has phone & email", entityType: "prospect", scoreValue: 5, conditionJson: { hasPhone: true, hasEmail: true } as any },
    { ruleName: "Reached MQL", entityType: "prospect", scoreValue: 20, conditionJson: { stage: "Qualified (MQL)" } as any },
  ]);

  await db.insert(slaRules).values([
    { ruleName: "First response — New leads",   maxResponseMinutes: 60,  priority: "high" },
    { ruleName: "Followup — Working leads",     maxFollowupHours: 48,    priority: "normal" },
    { ruleName: "Followup — Negotiation",       maxFollowupHours: 24,    priority: "high" },
  ]);

  await db.insert(customFields).values([
    { entityType: "prospect", fieldKey: "preferred_language", fieldLabel: "Preferred Language", fieldType: "select", optionsJson: ["Arabic", "English"] as any, displayOrder: 1 },
    { entityType: "prospect", fieldKey: "company_size",        fieldLabel: "Company Size",       fieldType: "select", optionsJson: ["1-10", "11-50", "51-200", "200+"] as any, displayOrder: 2 },
    { entityType: "deal",     fieldKey: "contract_term_months",fieldLabel: "Contract Term (months)", fieldType: "number", displayOrder: 1 },
  ]);
}

async function seedCampaigns() {
  const camps = await db
    .insert(campaigns)
    .values([
      { campaignName: "Mofawtar — Q2 Brand Awareness",       objective: "Awareness",    buyingType: "Auction", status: "active", startDate: "2026-04-01", endDate: "2026-06-30", budget: "120000.00" },
      { campaignName: "Mofawtar — Lead Gen (Cairo SMB)",     objective: "Lead Gen",     buyingType: "Auction", status: "active", startDate: "2026-04-01", endDate: "2026-06-30", budget: "180000.00" },
      { campaignName: "Mofawtar — Messages (WhatsApp)",      objective: "Messages",     buyingType: "Auction", status: "active", startDate: "2026-04-01", endDate: "2026-06-30", budget: "150000.00" },
      { campaignName: "Mofawtar — Pro Tier Conversions",     objective: "Conversions",  buyingType: "Auction", status: "active", startDate: "2026-04-15", endDate: "2026-06-30", budget: "220000.00" },
      { campaignName: "Mofawtar — Retargeting Q2",           objective: "Conversions",  buyingType: "Auction", status: "active", startDate: "2026-05-01", endDate: "2026-06-30", budget: "90000.00" },
    ])
    .returning();

  const adSetsList: any[] = [];
  const adsList: any[] = [];

  const audiences = ["Cairo SMB owners 28-45", "Egypt e-commerce 25-44", "Tech founders 30-50", "Retail managers 28-50", "Lookalike Top 5%"];
  const placements = ["Facebook Feed", "Instagram Feed", "Instagram Reels", "Stories", "Audience Network"];
  const goals = ["Conversations", "Leads", "Link Clicks", "Reach", "Conversions"];

  for (const c of camps) {
    const numAS = ri(2, 4);
    for (let i = 1; i <= numAS; i++) {
      const a = await db
        .insert(adSets)
        .values({
          campaignId: c.id,
          adsetName: `${c.campaignName.split("—")[1].trim()} — Adset ${i}`,
          audience: pick(audiences),
          placement: pick(placements),
          optimizationGoal: pick(goals),
          status: "active",
          startDate: c.startDate,
          endDate: c.endDate,
          budget: (parseFloat(c.budget!) / numAS).toFixed(2),
        })
        .returning();
      adSetsList.push(a[0]);

      const numAds = ri(2, 3);
      for (let j = 1; j <= numAds; j++) {
        const ad = await db
          .insert(ads)
          .values({
            campaignId: c.id,
            adsetId: a[0].id,
            adName: `Creative V${j} — ${c.campaignName.split("—")[1].trim()}`,
            creativeName: `creative_v${j}_${c.id}_${a[0].id}`,
            creativeType: pick(["Image", "Video", "Carousel"]),
            primaryText: "Mofawtar — أتمتة المبيعات و التسويق لمؤسستك. ابدأ تجربتك المجانية اليوم!",
            headline: pick(["جرب Mofawtar مجاناً", "ابدأ نموك الآن", "حلول CRM ذكية"]),
            cta: pick(["Learn More", "Sign Up", "Send Message", "Get Quote"]),
            status: "active",
          })
          .returning();
        adsList.push(ad[0]);
      }
    }
  }

  return { camps, adSetsList, adsList };
}

async function seedMetaDailyPerformance(camps: any[], adSetsList: any[], adsList: any[]) {
  const startDate = new Date("2026-04-01T00:00:00Z");
  const endDate = new Date("2026-06-30T00:00:00Z");
  const rows: any[] = [];

  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const dayStr = d.toISOString().slice(0, 10);
    const month = yearMonth(d);
    const week = isoWeek(d);
    const quarter = yearQuarter(d);
    // produce per-ad daily perf (sparse — about 60% of ads run on each day)
    for (const ad of adsList) {
      if (rand() < 0.4) continue;
      const adset = adSetsList.find((a) => a.id === ad.adsetId)!;
      const camp = camps.find((c) => c.id === ad.campaignId)!;
      // base spend depends on objective
      const baseSpend = camp.objective === "Conversions" ? ri(80, 350) : ri(40, 220);
      const spend = baseSpend + Math.floor(rand() * 80);
      const impressions = Math.floor(spend * (40 + rand() * 60));
      const reach = Math.floor(impressions * (0.5 + rand() * 0.3));
      const clicks = Math.floor(impressions * (0.008 + rand() * 0.025));
      const linkClicks = Math.floor(clicks * (0.6 + rand() * 0.3));
      const lpv = Math.floor(linkClicks * (0.5 + rand() * 0.4));
      const isMsg = camp.objective === "Messages" || rand() < 0.4;
      const conv = isMsg ? Math.floor(spend / (35 + rand() * 25)) : 0;
      const replies = Math.floor(conv * (0.5 + rand() * 0.35));
      const newContacts = Math.floor(conv * (0.4 + rand() * 0.4));
      const wa = Math.floor(conv * (0.6 + rand() * 0.3));
      const messenger = Math.floor(conv * (0.2 + rand() * 0.2));
      const ig = conv - wa - messenger;
      const isLead = camp.objective === "Lead Gen" || rand() < 0.2;
      const metaLeads = isLead ? Math.floor(spend / (60 + rand() * 50)) : 0;
      const isConv = camp.objective === "Conversions" || rand() < 0.15;
      const websiteRegs = isConv ? Math.floor(spend / (120 + rand() * 80)) : 0;
      const purchases = isConv ? Math.floor(websiteRegs * (0.3 + rand() * 0.3)) : 0;

      rows.push({
        date: dayStr,
        quarter,
        month,
        week,
        campaignId: camp.id,
        adsetId: adset.id,
        adId: ad.id,
        channel: "Meta",
        amountSpent: spend.toFixed(2),
        impressions,
        reach,
        clicks,
        linkClicks,
        landingPageViews: lpv,
        frequency: (impressions / Math.max(reach, 1)).toFixed(4),
        ctr: (clicks / Math.max(impressions, 1)).toFixed(6),
        cpc: (spend / Math.max(clicks, 1)).toFixed(4),
        cpm: ((spend / Math.max(impressions, 1)) * 1000).toFixed(4),
        messagingConversationsStarted: conv,
        messagingConversationsReplied: replies,
        newMessagingContacts: newContacts,
        totalMessagingContacts: newContacts + ri(0, 3),
        whatsappConversations: Math.max(0, wa),
        messengerConversations: Math.max(0, messenger),
        instagramDmConversations: Math.max(0, ig),
        metaLeads,
        websiteRegistrationsCompleted: websiteRegs,
        purchases,
      });
    }
  }
  // batch insert
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.insert(metaDailyPerformance).values(rows.slice(i, i + BATCH));
  }
  return rows.length;
}

async function seedProspectsAndDeals(usersAll: any[], camps: any[], adSetsList: any[], adsList: any[], stages: any[], products_: any[]) {
  const sales = usersAll.filter((u) => u.team === "Sales");
  const stageNew = (stages.find((s) => s.stageName === "Prospect") ?? stages.find((s) => s.stageName === "Lead"))!;
  const stageContacted = stages.find((s) => s.stageName === "Contacted")!;
  const stageMql = stages.find((s) => s.stageName === "Qualified (MQL)")!;
  const stageSql = stages.find((s) => s.stageName === "SQL")!;
  const stageProposal = stages.find((s) => s.stageName === "Proposal")!;
  const stageNeg = stages.find((s) => s.stageName === "Negotiation")!;
  const stageWon = stages.find((s) => s.stageName === "Won")!;
  const stageLost = stages.find((s) => s.stageName === "Lost")!;

  const lostReasonsAll = await db.select().from(lostReasons);

  const channels = ["Meta Ads (Facebook)", "Meta Ads (Instagram)", "WhatsApp", "Messenger", "Website Form", "Phone Call", "Referral"];
  const start = new Date("2026-04-01T00:00:00Z");
  const end = new Date("2026-06-30T00:00:00Z");

  let counter = 0;
  const allInserted: any[] = [];

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const isWeekend = d.getUTCDay() === 5 || d.getUTCDay() === 6;
    const numLeads = isWeekend ? ri(15, 25) : ri(25, 38);

    for (let i = 0; i < numLeads; i++) {
      counter++;
      const fn = pick(FIRST_NAMES);
      const ln = pick(LAST_NAMES);
      const channel = pick(channels);
      const isMeta = channel.startsWith("Meta") || rand() < 0.6;
      const camp = isMeta ? pick(camps) : null;
      const adset = camp ? adSetsList.find((a) => a.campaignId === camp.id && rand() < 0.5) ?? adSetsList.find((a) => a.campaignId === camp.id) : null;
      const ad = adset ? adsList.find((a) => a.adsetId === adset.id && rand() < 0.5) ?? adsList.find((a) => a.adsetId === adset.id) : null;

      const createdMs = d.getTime() + Math.floor(rand() * 86400000);
      const createdDate = new Date(createdMs);

      // Funnel progression sample
      const r1 = rand();
      let stageId = stageNew.id;
      let mqlAt: Date | null = null,
        sqlAt: Date | null = null,
        wonAt: Date | null = null,
        lostAt: Date | null = null,
        firstReplyAt: Date | null = null,
        lastActivityAt: Date | null = null,
        lostReasonId: number | null = null,
        nextFollowupAt: Date | null = null;

      if (r1 < 0.85) {
        // contacted at least
        stageId = stageContacted.id;
        firstReplyAt = new Date(createdMs + ri(5, 240) * 60000);
        lastActivityAt = firstReplyAt;
      }
      const r2 = rand();
      if (r1 < 0.85 && r2 < 0.55) {
        stageId = stageMql.id;
        mqlAt = new Date(createdMs + ri(1, 4) * 86400000);
        lastActivityAt = mqlAt;
      }
      const r3 = rand();
      if (mqlAt && r3 < 0.55) {
        stageId = stageSql.id;
        sqlAt = new Date(mqlAt.getTime() + ri(1, 6) * 86400000);
        lastActivityAt = sqlAt;
      }
      const r4 = rand();
      if (sqlAt && r4 < 0.55) {
        stageId = stageProposal.id;
        lastActivityAt = new Date(sqlAt.getTime() + ri(1, 5) * 86400000);
      }
      const r5 = rand();
      if (sqlAt && r5 < 0.45) {
        stageId = stageNeg.id;
        lastActivityAt = new Date(sqlAt.getTime() + ri(2, 8) * 86400000);
      }
      const outcome = rand();
      if (sqlAt && outcome < 0.32) {
        stageId = stageWon.id;
        wonAt = new Date(sqlAt.getTime() + ri(3, 14) * 86400000);
        lastActivityAt = wonAt;
      } else if (sqlAt && outcome < 0.55) {
        stageId = stageLost.id;
        lostAt = new Date(sqlAt.getTime() + ri(2, 12) * 86400000);
        lostReasonId = pick(lostReasonsAll).id;
        lastActivityAt = lostAt;
      } else if (!sqlAt && rand() < 0.18) {
        stageId = stageLost.id;
        lostAt = new Date(createdMs + ri(2, 20) * 86400000);
        lostReasonId = pick(lostReasonsAll).id;
        lastActivityAt = lostAt;
      }

      // Active leads get next followup
      if (![stageWon.id, stageLost.id].includes(stageId)) {
        nextFollowupAt = new Date(Date.now() + ri(-2, 10) * 86400000);
      }

      const product = pick(products_);
      const assignedSales = pick(sales);

      const inserted = await db
        .insert(prospects)
        .values({
          prospectCode: `P-${String(counter).padStart(6, "0")}`,
          firstName: fn,
          lastName: ln,
          fullName: `${fn} ${ln}`,
          phone: `+201${ri(0, 1)}${ri(10000000, 99999999)}`,
          email: `${fn.toLowerCase()}.${ln.toLowerCase().replace(" ", "")}${ri(1, 999)}@example.com`,
          companyName: rand() < 0.7 ? pick(COMPANIES) : null,
          jobTitle: pick(["Owner", "Manager", "Director", "CEO", "Marketing Lead", "Sales Lead", "Operations"]),
          industry: pick(INDUSTRIES),
          city: pick(CITIES),
          country: "Egypt",
          channel,
          source: camp ? camp.campaignName : channel,
          utmSource: isMeta ? "meta" : null,
          utmMedium: isMeta ? "paid" : null,
          utmCampaign: camp ? camp.campaignName : null,
          utmContent: adset ? adset.adsetName : null,
          utmTerm: ad ? ad.adName : null,
          campaignId: camp?.id ?? null,
          adsetId: adset?.id ?? null,
          adId: ad?.id ?? null,
          campaignNameSnapshot: camp?.campaignName ?? null,
          adsetNameSnapshot: adset?.adsetName ?? null,
          adNameSnapshot: ad?.adName ?? null,
          isAttributed: !!camp,
          firstContactDate: createdDate,
          createdDate,
          assignedSalesId: assignedSales.id,
          leadStageId: stageId,
          leadQuality: pick(["hot", "warm", "warm", "cold"]),
          leadScore: ri(10, 95),
          customerType: pick(["B2B", "B2C", "B2B"]),
          productId: product.id,
          productInterest: product.productName,
          firstReplyAt,
          lastActivityAt,
          nextFollowupAt,
          mqlAt,
          sqlAt,
          wonAt,
          lostAt,
          lostReasonId,
          notes: rand() < 0.3 ? "Asked about pricing and onboarding timeline." : null,
        })
        .returning();
      const p = inserted[0];
      allInserted.push(p);

      // Activities
      const numActs = ri(0, 5);
      const actTypes = ["Call", "WhatsApp Message", "Email", "Demo", "Meeting (Online)", "Note", "Proposal Sent"];
      for (let k = 0; k < numActs; k++) {
        const at = firstReplyAt ?? createdDate;
        await db.insert(activities).values({
          prospectId: p.id,
          userId: assignedSales.id,
          activityDate: new Date(at.getTime() + k * ri(3, 36) * 3600000),
          activityType: pick(actTypes),
          activityChannel: channel,
          activityOutcome: pick(["Interested", "No answer", "Follow up later", "Not interested", "Demo booked"]),
          notes: rand() < 0.4 ? "Spoke about Pro tier pricing and integrations." : null,
          durationMinutes: ri(3, 45),
        });
      }

      // Deal if reached SQL or further
      if (sqlAt) {
        const expectedRev = parseFloat(product.price as any) * ri(1, 12);
        const won = wonAt ? true : false;
        const lost = lostAt && !wonAt ? true : false;
        const dealStage = won ? "Won" : lost ? "Lost" : (stageId === stageNeg.id ? "Negotiation" : stageId === stageProposal.id ? "Proposal" : "Qualified");
        const dealStatus = won ? "won" : lost ? "lost" : "open";
        const actualRev = won ? expectedRev * (0.85 + rand() * 0.15) : 0;
        await db.insert(deals).values({
          prospectId: p.id,
          dealName: `${product.productName} — ${p.fullName}`,
          dealStage,
          dealStatus,
          expectedRevenue: expectedRev.toFixed(2),
          actualRevenue: actualRev.toFixed(2),
          currency: "EGP",
          probability: won ? 100 : lost ? 0 : ri(40, 80),
          closeDate: wonAt ? wonAt.toISOString().slice(0, 10) : lostAt ? lostAt.toISOString().slice(0, 10) : null,
          wonDate: wonAt ? wonAt.toISOString().slice(0, 10) : null,
          lostDate: lostAt ? lostAt.toISOString().slice(0, 10) : null,
          lostReasonId,
          salesOwnerId: assignedSales.id,
          productId: product.id,
          campaignId: camp?.id ?? null,
          adsetId: adset?.id ?? null,
          adId: ad?.id ?? null,
        });
      }

      // Tasks for active leads
      if (nextFollowupAt && rand() < 0.4) {
        await db.insert(tasks).values({
          prospectId: p.id,
          assignedTo: assignedSales.id,
          createdBy: assignedSales.id,
          taskTitle: pick(["Follow up call", "Send proposal", "Schedule demo", "Send pricing"]),
          dueDate: nextFollowupAt,
          priority: pick(["normal", "high", "high", "low"]),
          status: rand() < 0.2 ? "Completed" : "Pending",
          completedAt: rand() < 0.2 ? new Date() : null,
        });
      }
    }
  }

  return allInserted.length;
}

async function seedDataQualityIssues(usersAll: any[], stages: any[]) {
  const stageNew = stages.find((s) => s.stageName === "Prospect") ?? stages[0];
  const salesUsers = usersAll.filter((u) => u.team === "Sales");
  const sharedPhone = `+20111${ri(10000000, 99999999)}`;

  // 15 unattributed prospects (no campaign, no adset, no ad)
  for (let i = 0; i < 15; i++) {
    const fn = pick(FIRST_NAMES);
    const ln = pick(LAST_NAMES);
    const counter = 9000 + i;
    await db.insert(prospects).values({
      prospectCode: `P-DQ${String(counter).padStart(4, "0")}`,
      firstName: fn,
      lastName: ln,
      fullName: `${fn} ${ln}`,
      phone: `+201${ri(0, 1)}${ri(10000000, 99999999)}`,
      email: `${fn.toLowerCase()}.dq${i}@example.com`,
      channel: "Website Form",
      source: "Unknown",
      campaignId: null,
      adsetId: null,
      adId: null,
      isAttributed: false,
      createdDate: new Date(`2026-0${ri(4, 6)}-${String(ri(1, 28)).padStart(2, "0")}T10:00:00Z`),
      assignedSalesId: pick(salesUsers).id,
      leadStageId: stageNew.id,
    });
  }

  // 5 duplicate-phone pairs (same phone, different records)
  for (let i = 0; i < 5; i++) {
    const dupPhone = `+20100${ri(1000000, 9999999)}`;
    for (let j = 0; j < 2; j++) {
      const fn = pick(FIRST_NAMES);
      const ln = pick(LAST_NAMES);
      await db.insert(prospects).values({
        prospectCode: `P-DUP${i}${j}`,
        firstName: fn,
        lastName: ln,
        fullName: `${fn} ${ln}`,
        phone: dupPhone, // same phone — intentional duplicate
        email: `dup.${i}.${j}@example.com`,
        channel: "WhatsApp",
        source: "Duplicate test",
        isAttributed: false,
        createdDate: new Date(`2026-05-${String(ri(1, 30)).padStart(2, "0")}T09:00:00Z`),
        assignedSalesId: pick(salesUsers).id,
        leadStageId: stageNew.id,
      });
    }
  }

  // 3 "won" prospects whose deals have no actualRevenue
  for (let i = 0; i < 3; i++) {
    const fn = pick(FIRST_NAMES);
    const ln = pick(LAST_NAMES);
    const p = await db.insert(prospects).values({
      prospectCode: `P-NREV${i}`,
      firstName: fn,
      lastName: ln,
      fullName: `${fn} ${ln}`,
      phone: `+20112${ri(1000000, 9999999)}`,
      email: `norev.${i}@example.com`,
      channel: "Phone Call",
      source: "Referral",
      isAttributed: false,
      createdDate: new Date("2026-04-15T08:00:00Z"),
      assignedSalesId: pick(salesUsers).id,
      leadStageId: stageNew.id,
      wonAt: new Date("2026-05-01T10:00:00Z"),
    }).returning();

    await db.insert(deals).values({
      prospectId: p[0].id,
      dealName: `No-Revenue Deal ${i}`,
      dealStage: "Won",
      dealStatus: "won",
      expectedRevenue: "5000.00",
      actualRevenue: "0.00", // intentional — won deal but no actual revenue recorded
      currency: "EGP",
      wonDate: "2026-05-01",
      salesOwnerId: pick(salesUsers).id,
    });
  }

  console.log("  ✓ data quality issues: 15 unattributed, 5 dup-phone pairs, 3 zero-revenue won deals");
}

async function main() {
  console.log("Clearing existing data…");
  await clearAll();

  console.log("Seeding roles & users…");
  const usersAll = await seedRolesAndUsers();
  console.log(`  ✓ ${usersAll.length} users`);

  console.log("Seeding lookups (stages/statuses/products/channels)…");
  const { stages, products: prods } = await seedLookups();
  console.log(`  ✓ ${stages.length} stages, ${prods.length} products`);

  console.log("Seeding settings (KPIs, scoring, SLA, custom fields)…");
  await seedSettings();

  console.log("Seeding campaigns / ad sets / ads…");
  const { camps, adSetsList, adsList } = await seedCampaigns();
  console.log(`  ✓ ${camps.length} campaigns, ${adSetsList.length} ad sets, ${adsList.length} ads`);

  console.log("Seeding Meta daily performance (Apr 1 – Jun 30, 2026)…");
  const perfRows = await seedMetaDailyPerformance(camps, adSetsList, adsList);
  console.log(`  ✓ ${perfRows} performance rows`);

  console.log("Seeding prospects, activities, deals, tasks…");
  const prospectsCount = await seedProspectsAndDeals(usersAll, camps, adSetsList, adsList, stages, prods);
  console.log(`  ✓ ${prospectsCount} prospects (with activities, deals, tasks)`);

  console.log("Seeding intentional data-quality issues…");
  await seedDataQualityIssues(usersAll, stages);

  console.log("\n✅ Seed complete.");
  console.log("\nDefault users:");
  console.log("  admin@mofawtar.com / Admin123456");
  console.log("  sales@mofawtar.com / Sales123456");
  console.log("  media@mofawtar.com / Media123456");

  await pool.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});

