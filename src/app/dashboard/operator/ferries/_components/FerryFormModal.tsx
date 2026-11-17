import * as React from "react";
import {
  Edit,
  ImageIcon,
  Loader2,
  Plus,
  Route as RouteIcon,
  Ship,
  Sparkles,
  X
} from "lucide-react";
import { toast } from "sonner";
import type {
  ICreateFerryPayload,
  IFerry,
  IUpdateFerryPayload,
  VesselStatus,
  VesselType
} from "@/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ReusableSelect,
  ScrollArea
} from "@/ui";
import { VesselImageUploader } from "@/widgets";
import { DedicatedRoutesSelect } from "./DedicatedRoutesSelect";
import {
  SUGGESTED_VESSEL_AMENITIES,
  getAmenityIcon
} from "./ferries-columns";

const FERRY_TYPE_OPTIONS: Array<{ value: VesselType; label: string }> = [
  { value: "CATAMARAN", label: "Catamaran (High-Speed)" },
  { value: "SPEEDBOAT", label: "Speedboat (Express)" },
  { value: "TRADITIONAL_FERRY", label: "Traditional Ferry" }
];

const FERRY_STATUS_OPTIONS: Array<{ value: VesselStatus; label: string }> = [
  { value: "IN_SERVICE", label: "In Service" },
  { value: "MAINTENANCE", label: "Maintenance" }
];

/** Same limits as the backend ferry validation. */
const MIN_CAPACITY = 5;
const MAX_CAPACITY = 1500;

/** One size for every control in the form. */
const FIELD_CLASS = "h-10 rounded-lg text-sm";

function FormSection({
  icon: Icon,
  title,
  hint,
  aside,
  children
}: {
  icon: React.ElementType;
  title: string;
  hint?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 py-5 first:pt-1 last:pb-1">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div>
            <h3 className="text-foreground text-sm font-semibold">{title}</h3>
            {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
          </div>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-foreground text-xs font-medium">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </Label>
      {children}
    </div>
  );
}

export interface FerryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingFerry: IFerry | null;
  onSubmitCreate: (payload: ICreateFerryPayload) => Promise<void>;
  onSubmitUpdate: (payload: IUpdateFerryPayload) => Promise<void>;
  isSubmitting: boolean;
}

export function FerryFormModal({
  isOpen,
  onClose,
  editingFerry,
  onSubmitCreate,
  onSubmitUpdate,
  isSubmitting
}: FerryFormModalProps) {
  const isEditing = Boolean(editingFerry);

  // Form states
  const [name, setName] = React.useState("");
  const [capacity, setCapacity] = React.useState(120);
  const [type, setType] = React.useState<VesselType>("CATAMARAN");
  const [status, setStatus] = React.useState<VesselStatus>("IN_SERVICE");
  const [imageUrl, setImageUrl] = React.useState("");
  const [amenities, setAmenities] = React.useState<string[]>([
    "Air Conditioned",
    "Life Jackets Provided",
    "Luggage Assistance"
  ]);
  const [customAmenity, setCustomAmenity] = React.useState("");
  const [routeIds, setRouteIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (editingFerry) {
      setRouteIds((editingFerry.dedicatedRoutes ?? []).map((r) => r.id));
      setName(editingFerry.name || "");
      setCapacity(editingFerry.capacity || 120);
      setType(editingFerry.type || "CATAMARAN");
      setStatus(editingFerry.status || "IN_SERVICE");
      setImageUrl(editingFerry.imageUrl || "");
      setAmenities(Array.isArray(editingFerry.amenities) ? editingFerry.amenities : []);
      setCustomAmenity("");
    } else {
      setRouteIds([]);
      setName("");
      setCapacity(120);
      setType("CATAMARAN");
      setStatus("IN_SERVICE");
      setImageUrl("");
      setAmenities([
        "Air Conditioned",
        "Life Jackets Provided",
        "Luggage Assistance"
      ]);
      setCustomAmenity("");
    }
  }, [editingFerry, isOpen]);

  const handleAddCustomAmenity = () => {
    const trimmed = customAmenity.trim();
    if (!trimmed) return;
    if (!amenities.includes(trimmed)) {
      setAmenities((prev) => [...prev, trimmed]);
    }
    setCustomAmenity("");
  };

  const removeAmenity = (item: string) => {
    setAmenities((prev) => prev.filter((a) => a !== item));
  };

  const toggleAmenity = (item: string) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const unselectedSuggestions = React.useMemo(() => {
    return SUGGESTED_VESSEL_AMENITIES.filter((item) => !amenities.includes(item));
  }, [amenities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please provide a Ferry Name.");
      return;
    }

    if (!capacity || capacity < MIN_CAPACITY || capacity > MAX_CAPACITY) {
      toast.error(`Capacity must be between ${MIN_CAPACITY} and ${MAX_CAPACITY} seats.`);
      return;
    }

    if (isEditing) {
      await onSubmitUpdate({
        name: name.trim(),
        capacity: Number(capacity),
        type,
        status,
        imageUrl: imageUrl.trim() || undefined,
        amenities,
        routeIds
      });
    } else {
      await onSubmitCreate({
        name: name.trim(),
        capacity: Number(capacity),
        type,
        status,
        imageUrl: imageUrl.trim() || undefined,
        amenities,
        routeIds
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-border/60 shrink-0 border-b px-6 py-4 pr-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {isEditing ? <Edit className="h-5 w-5" /> : <Ship className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-foreground text-base font-bold">
                {isEditing ? `Edit ${editingFerry?.name || "Ferry"}` : "Add New Ferry"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEditing
                  ? "Update this ferry's details, routes, onboard facilities and photo."
                  : "Add a ferry with its capacity, routes, onboard facilities and photo."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ScrollArea className="h-[min(65vh,560px)] w-full">
            <div className="divide-border/60 divide-y px-6 py-4">
              {/* 1. Ferry details */}
              <FormSection icon={Ship} title="Ferry details" hint="Name, size and current status.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Ferry name" htmlFor="ferry-name" required>
                    <Input
                      id="ferry-name"
                      placeholder="e.g. Island Star IV"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className={FIELD_CLASS}
                    />
                  </Field>

                  <Field label="Passenger capacity (seats)" htmlFor="ferry-cap" required>
                    <Input
                      id="ferry-cap"
                      type="number"
                      min={MIN_CAPACITY}
                      max={MAX_CAPACITY}
                      value={capacity}
                      onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
                      required
                      className={FIELD_CLASS}
                    />
                  </Field>

                  <Field label="Ferry type" required>
                    <ReusableSelect
                      value={type}
                      onValueChange={(val) => setType(val as VesselType)}
                      options={FERRY_TYPE_OPTIONS}
                      placeholder="Select ferry type"
                      className={FIELD_CLASS}
                    />
                  </Field>

                  <Field label="Status" required>
                    <ReusableSelect
                      value={status}
                      onValueChange={(val) => setStatus(val as VesselStatus)}
                      options={FERRY_STATUS_OPTIONS}
                      placeholder="Select status"
                      className={FIELD_CLASS}
                    />
                  </Field>
                </div>
              </FormSection>

              {/* 2. Routes */}
              <FormSection
                icon={RouteIcon}
                title="Dedicated routes"
                hint="Optional. Limit this ferry's trips to these routes, or leave empty to allow any route."
              >
                <DedicatedRoutesSelect
                  value={routeIds}
                  onChange={setRouteIds}
                  savedRoutes={editingFerry?.dedicatedRoutes}
                />
              </FormSection>

              {/* 3. What's included */}
              <FormSection
                icon={Sparkles}
                title="What's included"
                hint="What passengers get with their ticket."
                aside={
                  <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    {amenities.length} selected
                  </span>
                }
              >
                {amenities.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {amenities.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-1 pr-1 pl-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-300"
                      >
                        {getAmenityIcon(item)}
                        {item}
                        <button
                          type="button"
                          onClick={() => removeAmenity(item)}
                          className="cursor-pointer rounded-md p-0.5 transition-colors hover:bg-emerald-500/25"
                          title={`Remove ${item}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Nothing added yet. Pick from the suggestions below or type your own.
                  </p>
                )}

                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Add your own, e.g. Scenic Sun Deck"
                    value={customAmenity}
                    onChange={(e) => setCustomAmenity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomAmenity();
                      }
                    }}
                    className={`${FIELD_CLASS} flex-1`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddCustomAmenity}
                    disabled={!customAmenity.trim()}
                    className="h-10 shrink-0 cursor-pointer rounded-lg px-4 text-sm"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add
                  </Button>
                </div>

                {unselectedSuggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                      Suggestions
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {unselectedSuggestions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleAmenity(item)}
                          className="border-border text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1 text-xs transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/5"
                        >
                          <Plus className="h-3 w-3 opacity-70" />
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </FormSection>

              {/* 4. Photo */}
              <FormSection icon={ImageIcon} title="Photo" hint="Optional.">
                <VesselImageUploader value={imageUrl} onChange={setImageUrl} hideLabel />
              </FormSection>
            </div>
          </ScrollArea>

          <DialogFooter className="border-border/60 bg-muted/40 flex shrink-0 items-center justify-end gap-2 border-t px-6 py-3.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 rounded-lg text-sm"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 cursor-pointer rounded-lg bg-emerald-600 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  {isEditing ? "Saving..." : "Adding..."}
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Add Ferry"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
