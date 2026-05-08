import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultPickupScheduleSettings, PickupScheduleSettings } from "./pickup-scheduling";
import { getSupabaseServerClient } from "./supabase-server";

type StorefrontSettingsRow = {
  id: string;
  block_saturday: boolean | null;
  block_sunday: boolean | null;
  updated_at: string | null;
};

type StoredStorefrontSettings = PickupScheduleSettings;

const dataDirectory = path.join(process.cwd(), "data");
const storefrontSettingsFilePath = path.join(dataDirectory, "storefront-settings.json");
const STORE_ID = "default";

function normalizeSettings(value: Partial<StoredStorefrontSettings> | null | undefined): PickupScheduleSettings {
  return {
    blockSaturday: Boolean(value?.blockSaturday),
    blockSunday: Boolean(value?.blockSunday),
  };
}

function mapRowToSettings(row: StorefrontSettingsRow | null | undefined): PickupScheduleSettings {
  return {
    blockSaturday: Boolean(row?.block_saturday),
    blockSunday: Boolean(row?.block_sunday),
  };
}

async function readLocalSettings() {
  try {
    const contents = await readFile(storefrontSettingsFilePath, "utf8");
    return normalizeSettings(JSON.parse(contents) as Partial<StoredStorefrontSettings>);
  } catch {
    return defaultPickupScheduleSettings;
  }
}

async function writeLocalSettings(settings: PickupScheduleSettings) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(storefrontSettingsFilePath, JSON.stringify(settings, null, 2));
}

function getSupabaseClient() {
  return getSupabaseServerClient();
}

export async function getStorefrontSettings() {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase.from("storefront_settings").select("*").eq("id", STORE_ID).maybeSingle();

      if (error) {
        console.error("Storefront settings could not be loaded from Supabase.", error);
        return defaultPickupScheduleSettings;
      }

      return data ? mapRowToSettings(data as StorefrontSettingsRow) : defaultPickupScheduleSettings;
    } catch (error) {
      console.error("Storefront settings lookup failed.", error);
      return defaultPickupScheduleSettings;
    }
  }

  return readLocalSettings();
}

export async function updateStorefrontSettings(settings: PickupScheduleSettings) {
  const normalizedSettings = normalizeSettings(settings);
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("storefront_settings")
      .upsert(
        {
          id: STORE_ID,
          block_saturday: normalizedSettings.blockSaturday,
          block_sunday: normalizedSettings.blockSunday,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error("Storefront settings could not be saved to Supabase.");
    }

    return data ? mapRowToSettings(data as StorefrontSettingsRow) : normalizedSettings;
  }

  await writeLocalSettings(normalizedSettings);
  return normalizedSettings;
}
