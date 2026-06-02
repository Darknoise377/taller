ALTER TABLE "MeliListing" ADD COLUMN "syncedProductPrice" DOUBLE PRECISION;
ALTER TABLE "MeliListing" ADD COLUMN "syncedProductStock" INTEGER;
ALTER TABLE "MeliListing" ADD COLUMN "meliVisitsTotal" INTEGER;
ALTER TABLE "MeliListing" ADD COLUMN "meliVisitsCheckedAt" TIMESTAMP(3);
