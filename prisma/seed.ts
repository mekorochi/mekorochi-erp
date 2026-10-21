import { PrismaClient, UserRole, ProductType, UnitOfMeasure, WarehouseType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding MEKOROCHI ERP development data...");

  const existingSettings = await prisma.companySettings.findFirst();
  if (existingSettings?.isOnboarded) {
    console.log("Database already seeded (company is onboarded). Skipping.");
    return;
  }

  // Company Settings
  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      companyName: "MEKOROCHI",
      legalName: "Jay Veer Alliance Private Limited",
      tagline: "Healthy Bean to Bar",
      city: "Ahmedabad",
      state: "Gujarat",
      country: "India",
      currency: "INR",
      timezone: "Asia/Kolkata",
      financialYearStart: 4,
      invoicePrefix: "INV",
      orderPrefix: "ORD",
      quotePrefix: "QUO",
      poPrefix: "PO",
      isOnboarded: true,
    },
    update: {},
  });

  // Owner user (DEV ONLY)
  const ownerPassword = await bcrypt.hash("mekorochi2024", 12);
  const owner = await prisma.user.upsert({
    where: { email: "owner@mekorochi.com" },
    create: {
      email: "owner@mekorochi.com",
      name: "MEKOROCHI Owner",
      passwordHash: ownerPassword,
      role: UserRole.OWNER,
      isActive: true,
    },
    update: {},
  });

  // Staff users
  const staffPassword = await bcrypt.hash("staff2024", 12);
  await prisma.user.upsert({
    where: { email: "sales@mekorochi.com" },
    create: {
      email: "sales@mekorochi.com",
      name: "Sales Team",
      passwordHash: staffPassword,
      role: UserRole.SALES,
      isActive: true,
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { email: "inventory@mekorochi.com" },
    create: {
      email: "inventory@mekorochi.com",
      name: "Inventory Manager",
      passwordHash: staffPassword,
      role: UserRole.INVENTORY,
      isActive: true,
    },
    update: {},
  });

  // Warehouses
  const rawWarehouse = await prisma.warehouse.upsert({
    where: { code: "RAW" },
    create: { name: "Raw Materials Store", code: "RAW", type: WarehouseType.RAW_MATERIALS },
    update: {},
  });

  const packWarehouse = await prisma.warehouse.upsert({
    where: { code: "PKG" },
    create: { name: "Packaging Store", code: "PKG", type: WarehouseType.PACKAGING },
    update: {},
  });

  const fgWarehouse = await prisma.warehouse.upsert({
    where: { code: "FG" },
    create: { name: "Finished Goods", code: "FG", type: WarehouseType.FINISHED_GOODS, isDefault: true },
    update: {},
  });

  await prisma.warehouse.upsert({
    where: { code: "DSP" },
    create: { name: "Dispatch Bay", code: "DSP", type: WarehouseType.DISPATCH },
    update: {},
  });

  await prisma.warehouse.upsert({
    where: { code: "QTN" },
    create: { name: "Quarantine", code: "QTN", type: WarehouseType.QUARANTINE },
    update: {},
  });

  // Categories
  const rawCat = await prisma.category.upsert({
    where: { slug: "raw-materials" },
    create: { name: "Raw Materials", slug: "raw-materials", sortOrder: 1 },
    update: {},
  });

  const packCat = await prisma.category.upsert({
    where: { slug: "packaging" },
    create: { name: "Packaging", slug: "packaging", sortOrder: 2 },
    update: {},
  });

  const barsCat = await prisma.category.upsert({
    where: { slug: "chocolate-bars" },
    create: { name: "Chocolate Bars", slug: "chocolate-bars", sortOrder: 3 },
    update: {},
  });

  const bonbonsCat = await prisma.category.upsert({
    where: { slug: "bonbons" },
    create: { name: "Bonbons", slug: "bonbons", sortOrder: 4 },
    update: {},
  });

  const boxesCat = await prisma.category.upsert({
    where: { slug: "chocolate-boxes" },
    create: { name: "Chocolate Boxes", slug: "chocolate-boxes", sortOrder: 5 },
    update: {},
  });

  const giftsCat = await prisma.category.upsert({
    where: { slug: "gift-hampers" },
    create: { name: "Gift Hampers", slug: "gift-hampers", sortOrder: 6 },
    update: {},
  });

  // Sample Products — Raw Materials
  await prisma.product.upsert({
    where: { sku: "RM-CACAO-001" },
    create: {
      name: "Single Origin Cacao Beans (Kerala)",
      sku: "RM-CACAO-001",
      slug: "single-origin-cacao-beans-kerala",
      categoryId: rawCat.id,
      type: ProductType.RAW_MATERIAL,
      unitOfMeasure: UnitOfMeasure.KILOGRAM,
      hsnCode: "1801",
      reorderLevel: 10,
      shelfLifeDays: 365,
      allergens: "May contain traces of nuts",
    },
    update: {},
  });

  await prisma.product.upsert({
    where: { sku: "RM-COCOA-BTR" },
    create: {
      name: "Cocoa Butter (Organic)",
      sku: "RM-COCOA-BTR",
      slug: "cocoa-butter-organic",
      categoryId: rawCat.id,
      type: ProductType.RAW_MATERIAL,
      unitOfMeasure: UnitOfMeasure.KILOGRAM,
      hsnCode: "1804",
      reorderLevel: 5,
      shelfLifeDays: 365,
    },
    update: {},
  });

  await prisma.product.upsert({
    where: { sku: "RM-JAGGERY" },
    create: {
      name: "Organic Jaggery Powder",
      sku: "RM-JAGGERY",
      slug: "organic-jaggery-powder",
      categoryId: rawCat.id,
      type: ProductType.RAW_MATERIAL,
      unitOfMeasure: UnitOfMeasure.KILOGRAM,
      hsnCode: "1701",
      reorderLevel: 5,
    },
    update: {},
  });

  // Packaging
  await prisma.product.upsert({
    where: { sku: "PKG-BAR-WRAP" },
    create: {
      name: "Bar Wrapper (Eco-friendly)",
      sku: "PKG-BAR-WRAP",
      slug: "bar-wrapper-eco",
      categoryId: packCat.id,
      type: ProductType.PACKAGING,
      unitOfMeasure: UnitOfMeasure.PIECE,
      reorderLevel: 500,
    },
    update: {},
  });

  await prisma.product.upsert({
    where: { sku: "PKG-BOX-9" },
    create: {
      name: "9-Piece Bonbon Box",
      sku: "PKG-BOX-9",
      slug: "nine-piece-bonbon-box",
      categoryId: packCat.id,
      type: ProductType.PACKAGING,
      unitOfMeasure: UnitOfMeasure.PIECE,
      reorderLevel: 200,
    },
    update: {},
  });

  await prisma.product.upsert({
    where: { sku: "PKG-BOX-16" },
    create: {
      name: "16-Piece Bonbon Box",
      sku: "PKG-BOX-16",
      slug: "sixteen-piece-bonbon-box",
      categoryId: packCat.id,
      type: ProductType.PACKAGING,
      unitOfMeasure: UnitOfMeasure.PIECE,
      reorderLevel: 100,
    },
    update: {},
  });

  // Finished Goods — Bars
  await prisma.product.upsert({
    where: { sku: "BAR-DARK-72" },
    create: {
      name: "72% Dark Chocolate Bar",
      sku: "BAR-DARK-72",
      slug: "72-dark-chocolate-bar",
      categoryId: barsCat.id,
      type: ProductType.FINISHED_GOOD,
      unitOfMeasure: UnitOfMeasure.PIECE,
      weight: 80,
      weightUnit: "g",
      hsnCode: "1806",
      taxRate: 18,
      shelfLifeDays: 180,
      allergens: "Contains cacao. May contain traces of milk and nuts.",
      ingredients: "Cacao beans, cocoa butter, organic jaggery",
    },
    update: {},
  });

  await prisma.product.upsert({
    where: { sku: "BAR-MILK-55" },
    create: {
      name: "55% Milk Chocolate Bar",
      sku: "BAR-MILK-55",
      slug: "55-milk-chocolate-bar",
      categoryId: barsCat.id,
      type: ProductType.FINISHED_GOOD,
      unitOfMeasure: UnitOfMeasure.PIECE,
      weight: 80,
      weightUnit: "g",
      hsnCode: "1806",
      taxRate: 18,
      shelfLifeDays: 120,
      allergens: "Contains milk and cacao. May contain traces of nuts.",
    },
    update: {},
  });

  // Bonbons
  await prisma.product.upsert({
    where: { sku: "BON-ROASTED" },
    create: {
      name: "Roasted Almond Bonbon",
      sku: "BON-ROASTED",
      slug: "roasted-almond-bonbon",
      categoryId: bonbonsCat.id,
      type: ProductType.FINISHED_GOOD,
      unitOfMeasure: UnitOfMeasure.PIECE,
      weight: 15,
      weightUnit: "g",
      hsnCode: "1806",
      taxRate: 18,
      shelfLifeDays: 90,
      allergens: "Contains almonds, cacao, milk",
    },
    update: {},
  });

  // Bundles — Boxes
  await prisma.product.upsert({
    where: { sku: "BOX-9-ASSORTED" },
    create: {
      name: "Assorted Bonbon Box (9 pcs)",
      sku: "BOX-9-ASSORTED",
      slug: "assorted-bonbon-box-9",
      categoryId: boxesCat.id,
      type: ProductType.BUNDLE,
      unitOfMeasure: UnitOfMeasure.BOX,
      hsnCode: "1806",
      taxRate: 18,
      isBundle: true,
      shelfLifeDays: 60,
    },
    update: {},
  });

  // Expense Categories
  const expenseCategories = [
    "Ingredients & Raw Materials",
    "Packaging Materials",
    "Logistics & Shipping",
    "Marketing & Advertising",
    "Salaries & Wages",
    "Rent & Utilities",
    "Software & Subscriptions",
    "Machinery & Equipment",
    "Travel & Conveyance",
    "Office Supplies",
    "Professional Services",
    "Miscellaneous",
  ];

  for (const catName of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { name: catName },
      create: { name: catName },
      update: {},
    });
  }

  // Sample Supplier
  await prisma.supplier.upsert({
    where: { id: "seed-supplier-1" },
    create: {
      id: "seed-supplier-1",
      name: "Kerala Cacao Farms",
      contactPerson: "Rajesh Kumar",
      email: "info@keralacacaofarms.example",
      phone: "+91 9876543210",
      city: "Kochi",
      state: "Kerala",
      country: "India",
      paymentTerms: "Net 30",
      creditDays: 30,
    },
    update: {},
  });

  console.log("Seed completed successfully!");
  console.log("Dev login: owner@mekorochi.com / mekorochi2024");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
