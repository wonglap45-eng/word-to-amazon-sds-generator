"use client";

import { useCallback, useRef } from "react";
import {
  Building2,
  FlaskConical,
  Truck,
  Scale,
  Upload,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SdsSettings } from "@/lib/types";

/* ───── Props ───── */

interface SdsSettingsFormProps {
  settings: SdsSettings;
  on_settings_change: (settings: SdsSettings) => void;
}

/* ───── Reusable field row ───── */

function FieldRow({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  large,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  large?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {large ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-xs outline-none transition-colors hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary resize-none"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-xs outline-none transition-colors hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary"
        />
      )}
    </div>
  );
}

/* ───── Section wrapper ───── */

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

/* ───── Stamp / signature upload ───── */

function StampUpload({
  data_url,
  on_change,
}: {
  data_url: string;
  on_change: (url: string) => void;
}) {
  const input_ref = useRef<HTMLInputElement>(null);

  const handle_file = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Only accept images
      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        on_change(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [on_change]
  );

  return (
    <div className="col-span-full space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        Company Stamp / Signature
      </label>
      <input
        ref={input_ref}
        type="file"
        accept="image/*"
        onChange={handle_file}
        className="hidden"
      />

      {data_url ? (
        <div className="relative inline-block">
          <img
            src={data_url}
            alt="Company stamp"
            className="max-h-24 rounded border border-border object-contain"
          />
          <button
            type="button"
            onClick={() => on_change("")}
            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input_ref.current?.click()}
          className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Upload className="h-4 w-4" />
          Click to upload stamp or signature image
        </button>
      )}
    </div>
  );
}

/* ───── Main component ───── */

export function SdsSettingsForm({
  settings,
  on_settings_change,
}: SdsSettingsFormProps) {
  /** Generic updater for nested objects */
  const update = useCallback(
    <K extends keyof SdsSettings>(
      section: K,
      field: string,
      value: string
    ) => {
      on_settings_change({
        ...settings,
        [section]: {
          ...settings[section],
          [field]: value,
        },
      });
    },
    [settings, on_settings_change]
  );

  const ki = settings.kit_info;
  const pp = settings.physical_properties;
  const ti = settings.transport_info;
  const ri = settings.regulatory_info;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Configure the SDS document metadata, physical properties, transport and
        regulatory information. All fields are editable.
      </p>

      {/* ─────── Kit Information ─────── */}
      <SectionCard icon={Building2} title="Kit Information">
        <FieldRow
          label="Kit Name"
          value={ki.kit_name}
          onChange={(v) => update("kit_info", "kit_name", v)}
          placeholder="Golf Club Cleaning Kit"
        />
        <FieldRow
          label="ASIN"
          value={ki.asin}
          onChange={(v) => update("kit_info", "asin", v)}
          placeholder="B0GDFYB87T"
        />
        <FieldRow
          label="Supplier Name"
          value={ki.supplier_name}
          onChange={(v) => update("kit_info", "supplier_name", v)}
          placeholder="TEHCIN"
        />
        <FieldRow
          label="Address"
          value={ki.address}
          onChange={(v) => update("kit_info", "address", v)}
          placeholder="Supplier address"
          large
        />
        <FieldRow
          label="Telephone"
          value={ki.telephone}
          onChange={(v) => update("kit_info", "telephone", v)}
          placeholder="+1-XXX-XXX-XXXX"
        />
        <FieldRow
          label="Email"
          value={ki.email}
          onChange={(v) => update("kit_info", "email", v)}
          placeholder="contact@company.com"
        />
        <FieldRow
          label="Emergency Telephone"
          value={ki.emergency_telephone}
          onChange={(v) => update("kit_info", "emergency_telephone", v)}
          placeholder="+1-XXX-XXX-XXXX"
        />
        <FieldRow
          label="Issue Date"
          value={ki.issue_date}
          onChange={(v) => update("kit_info", "issue_date", v)}
          type="date"
        />
        <FieldRow
          label="Version"
          value={ki.version}
          onChange={(v) => update("kit_info", "version", v)}
          placeholder="1.0"
        />
        <FieldRow
          label="Report Number Prefix"
          value={ki.report_number_prefix}
          onChange={(v) => update("kit_info", "report_number_prefix", v)}
          placeholder="SDS-GCCK"
        />
        <StampUpload
          data_url={ki.company_stamp_data_url}
          on_change={(url) => update("kit_info", "company_stamp_data_url", url)}
        />
      </SectionCard>

      {/* ─────── Physical & Chemical Properties ─────── */}
      <SectionCard icon={FlaskConical} title="Physical & Chemical Properties">
        <FieldRow
          label="Appearance"
          value={pp.appearance}
          onChange={(v) => update("physical_properties", "appearance", v)}
        />
        <FieldRow
          label="Odor"
          value={pp.odor}
          onChange={(v) => update("physical_properties", "odor", v)}
        />
        <FieldRow
          label="Odor Threshold"
          value={pp.odor_threshold}
          onChange={(v) => update("physical_properties", "odor_threshold", v)}
        />
        <FieldRow
          label="pH"
          value={pp.ph}
          onChange={(v) => update("physical_properties", "ph", v)}
        />
        <FieldRow
          label="Melting Point / Freezing Point"
          value={pp.melting_point}
          onChange={(v) => update("physical_properties", "melting_point", v)}
        />
        <FieldRow
          label="Initial Boiling Point / BP Range"
          value={pp.boiling_point}
          onChange={(v) => update("physical_properties", "boiling_point", v)}
        />
        <FieldRow
          label="Flash Point"
          value={pp.flash_point}
          onChange={(v) => update("physical_properties", "flash_point", v)}
        />
        <FieldRow
          label="Evaporation Rate"
          value={pp.evaporation_rate}
          onChange={(v) => update("physical_properties", "evaporation_rate", v)}
        />
        <FieldRow
          label="Flammability"
          value={pp.flammability}
          onChange={(v) => update("physical_properties", "flammability", v)}
        />
        <FieldRow
          label="Upper / Lower Explosion Limits"
          value={pp.explosion_limits}
          onChange={(v) => update("physical_properties", "explosion_limits", v)}
        />
        <FieldRow
          label="Vapor Pressure"
          value={pp.vapor_pressure}
          onChange={(v) => update("physical_properties", "vapor_pressure", v)}
        />
        <FieldRow
          label="Vapor Density"
          value={pp.vapor_density}
          onChange={(v) => update("physical_properties", "vapor_density", v)}
        />
        <FieldRow
          label="Relative Density"
          value={pp.relative_density}
          onChange={(v) => update("physical_properties", "relative_density", v)}
        />
        <FieldRow
          label="Solubility"
          value={pp.solubility}
          onChange={(v) => update("physical_properties", "solubility", v)}
        />
        <FieldRow
          label="Partition Coefficient"
          value={pp.partition_coefficient}
          onChange={(v) =>
            update("physical_properties", "partition_coefficient", v)
          }
        />
        <FieldRow
          label="Autoignition Temperature"
          value={pp.autoignition_temperature}
          onChange={(v) =>
            update("physical_properties", "autoignition_temperature", v)
          }
        />
        <FieldRow
          label="Decomposition Temperature"
          value={pp.decomposition_temperature}
          onChange={(v) =>
            update("physical_properties", "decomposition_temperature", v)
          }
        />
        <FieldRow
          label="Viscosity"
          value={pp.viscosity}
          onChange={(v) => update("physical_properties", "viscosity", v)}
        />
      </SectionCard>

      {/* ─────── Transport Information ─────── */}
      <SectionCard icon={Truck} title="Transport Information (Section 14)">
        <FieldRow
          label="UN Number"
          value={ti.un_number}
          onChange={(v) => update("transport_info", "un_number", v)}
          large
        />
        <FieldRow
          label="UN Proper Shipping Name"
          value={ti.proper_shipping_name}
          onChange={(v) => update("transport_info", "proper_shipping_name", v)}
          large
        />
        <FieldRow
          label="Transport Hazard Class"
          value={ti.hazard_class}
          onChange={(v) => update("transport_info", "hazard_class", v)}
        />
        <FieldRow
          label="Packing Group"
          value={ti.packing_group}
          onChange={(v) => update("transport_info", "packing_group", v)}
        />
        <FieldRow
          label="Environmental Hazard"
          value={ti.environmental_hazard}
          onChange={(v) =>
            update("transport_info", "environmental_hazard", v)
          }
          large
        />
        <FieldRow
          label="Special Precautions"
          value={ti.special_precautions}
          onChange={(v) =>
            update("transport_info", "special_precautions", v)
          }
          large
        />
      </SectionCard>

      {/* ─────── Regulatory Information ─────── */}
      <SectionCard icon={Scale} title="Regulatory Information (Section 15)">
        <FieldRow
          label="GHS Classification"
          value={ri.ghs_classification}
          onChange={(v) => update("regulatory_info", "ghs_classification", v)}
          large
        />
        <FieldRow
          label="US EPA"
          value={ri.us_epa}
          onChange={(v) => update("regulatory_info", "us_epa", v)}
          large
        />
        <FieldRow
          label="California Proposition 65"
          value={ri.california_prop65}
          onChange={(v) =>
            update("regulatory_info", "california_prop65", v)
          }
          large
        />
        <FieldRow
          label="TSCA (USA)"
          value={ri.tsca}
          onChange={(v) => update("regulatory_info", "tsca", v)}
          large
        />
        <FieldRow
          label="EU CLP / GHS"
          value={ri.eu_clp}
          onChange={(v) => update("regulatory_info", "eu_clp", v)}
          large
        />
        <FieldRow
          label="Amazon Product Safety"
          value={ri.amazon_product_safety}
          onChange={(v) =>
            update("regulatory_info", "amazon_product_safety", v)
          }
          large
        />
      </SectionCard>
    </div>
  );
}
