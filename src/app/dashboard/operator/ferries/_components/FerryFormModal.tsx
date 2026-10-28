import * as React from "react";
import {
  Edit,
  Loader2,
  Plus,
  Ship,
  Sparkles,
  Tag,
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
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OUT_OF_SERVICE", label: "Out of Service" }
];

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
  const [registration, setRegistration] = React.useState("");
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

  React.useEffect(() => {
    if (editingFerry) {
      setName(editingFerry.name || "");
      setRegistration(editingFerry.registration || "");
      setCapacity(editingFerry.capacity || 120);
      setType(editingFerry.type || "CATAMARAN");
      setStatus(editingFerry.status || "IN_SERVICE");
      setImageUrl(editingFerry.imageUrl || "");
      setAmenities(Array.isArray(editingFerry.amenities) ? editingFerry.amenities : []);
      setCustomAmenity("");
    } else {
      setName("");
      setRegistration("");
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

    if (!name.trim() || !registration.trim()) {
      toast.error("Please provide both Ferry Name and Registration Number.");
      return;
    }

    if (!capacity || capacity <= 0) {
      toast.error("Capacity must be at least 1 passenger.");
      return;
    }

    if (isEditing) {
      await onSubmitUpdate({
        name: name.trim(),
        registration: registration.trim().toUpperCase(),
        capacity: Number(capacity),
        type,
        status,
        imageUrl: imageUrl.trim() || undefined,
        amenities
      });
    } else {
      await onSubmitCreate({
        name: name.trim(),
        registration: registration.trim().toUpperCase(),
        capacity: Number(capacity),
        type,
        status,
        imageUrl: imageUrl.trim() || undefined,
        amenities
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-border/60 border-b px-6 py-4 pr-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {isEditing ? <Edit className="h-5 w-5" /> : <Ship className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {isEditing ? "Edit Ferry Details" : "Add New Ferry"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEditing
                  ? "Update ferry name, registration number, passenger capacity, status, and onboard facilities."
                  : "Add a passenger ferry, catamaran, or speedboat with capacity and onboard amenities."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ScrollArea className="h-[min(65vh,540px)] w-full">
            <div className="space-y-4 px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ferry-name" className="text-xs font-semibold text-foreground">
                    Ferry Name *
                  </Label>
                  <Input
                    id="ferry-name"
                    placeholder="e.g. Island Star IV"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ferry-reg" className="text-xs font-semibold text-foreground">
                    Registration Number *
                  </Label>
                  <Input
                    id="ferry-reg"
                    placeholder="e.g. MV-2041 or REG-984"
                    value={registration}
                    onChange={(e) => setRegistration(e.target.value)}
                    required
                    className="text-xs h-9 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ferry-cap" className="text-xs font-semibold text-foreground">
                    Passenger Capacity (Seats) *
                  </Label>
                  <Input
                    id="ferry-cap"
                    type="number"
                    min="1"
                    max="5000"
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
                    required
                    className="text-xs h-9 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Ferry Type *
                  </Label>
                  <ReusableSelect
                    value={type}
                    onValueChange={(val) => setType(val as VesselType)}
                    options={FERRY_TYPE_OPTIONS}
                    placeholder="Select ferry type"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Operational Status *
                  </Label>
                  <ReusableSelect
                    value={status}
                    onValueChange={(val) => setStatus(val as VesselStatus)}
                    options={FERRY_STATUS_OPTIONS}
                    placeholder="Select status"
                  />
                </div>

                {/* Onboard Amenities / Facilities Section */}
                <div className="border-border/50 space-y-3 border-t pt-3 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        What&apos;s Included
                      </Label>
                      <p className="text-muted-foreground mt-0.5 text-[10px]">
                        What passengers get with their ticket (e.g. WiFi, AC, Baggage)
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {amenities.length} selected
                    </span>
                  </div>

                  {/* Active Selected Tags with Remove (x) */}
                  <div className="border-border/80 bg-muted/20 flex min-h-9 flex-wrap items-center gap-1.5 rounded-xl border border-dashed p-2">
                    {amenities.length > 0 ? (
                      amenities.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-2xs transition-all dark:text-emerald-300"
                        >
                          {getAmenityIcon(item)}
                          <span>{item}</span>
                          <button
                            type="button"
                            onClick={() => removeAmenity(item)}
                            className="ml-0.5 cursor-pointer rounded-full p-0.5 text-emerald-700 transition-colors hover:bg-emerald-500/30 dark:text-emerald-300"
                            title={`Remove ${item}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <p className="text-muted-foreground px-1 text-[11px] italic">
                        No facilities selected yet. Type custom items below or click popular options.
                      </p>
                    )}
                  </div>

                  {/* Custom Input Field with Add Button */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="text-muted-foreground absolute top-2.5 left-2.5 h-3.5 w-3.5" />
                      <Input
                        type="text"
                        placeholder="e.g. Life Jackets, AC Cabin, Scenic Sun Deck..."
                        value={customAmenity}
                        onChange={(e) => setCustomAmenity(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCustomAmenity();
                          }
                        }}
                        className="placeholder:text-muted-foreground h-8 pl-8 text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddCustomAmenity}
                      disabled={!customAmenity.trim()}
                      className="h-8 shrink-0 cursor-pointer border-emerald-500/40 px-3 text-xs text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Facility
                    </Button>
                  </div>

                  {/* Quick Suggestions - Only showing unselected options */}
                  <div className="space-y-1.5 pt-0.5">
                    <p className="text-muted-foreground text-[10px] font-medium">
                      Popular vessel features (click to add):
                    </p>
                    {unselectedSuggestions.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {unselectedSuggestions.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleAmenity(item)}
                            className="border-border/80 bg-muted/30 text-muted-foreground flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300"
                          >
                            {getAmenityIcon(item)}
                            <span>{item}</span>
                            <Plus className="text-muted-foreground ml-0.5 h-2.5 w-2.5 opacity-60" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-[10px] italic">
                        All popular amenities added. You can add more custom amenities above.
                      </p>
                    )}
                  </div>
                </div>

                {/* Ferry Vessel Image Uploader */}
                <div className="border-border/50 border-t pt-3 sm:col-span-2">
                  <VesselImageUploader
                    value={imageUrl}
                    onChange={setImageUrl}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="shrink-0 border-border/60 bg-muted/40 border-t px-6 py-3.5 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  {isEditing ? "Saving Changes..." : "Adding Ferry..."}
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
