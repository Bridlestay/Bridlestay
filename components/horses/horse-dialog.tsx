"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, X, Upload, Image as ImageIcon } from "lucide-react";
import {
  HORSE_BREEDS,
  GENDERS,
  TEMPERAMENTS,
  EXPERIENCE_LEVELS,
  DISCIPLINES,
  TURNOUT_PREFERENCES,
  QUICK_FACTS,
  filterBreeds,
} from "@/lib/horse-breeds";
import { createClient } from "@/lib/supabase/client";

interface HorseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  horse: any | null;
  onSuccess: () => void;
}

export function HorseDialog({ open, onOpenChange, horse, onSuccess }: HorseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [breedSearch, setBreedSearch] = useState("");
  const [showBreedDropdown, setShowBreedDropdown] = useState(false);
  const breedDropdownRef = useRef<HTMLDivElement>(null);
  
  // Basic Info
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [breed, setBreed] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [colorMarkings, setColorMarkings] = useState("");
  
  // Physical Details
  const [heightHands, setHeightHands] = useState("");
  const [weightKg, setWeightKg] = useState("");
  
  // Health & Special Needs
  const [dietaryRequirements, setDietaryRequirements] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [vaccinationDate, setVaccinationDate] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  
  // Behavior & Temperament
  const [temperament, setTemperament] = useState("");
  const [behaviorNotes, setBehaviorNotes] = useState("");
  const [turnoutPreferences, setTurnoutPreferences] = useState("");
  
  // Experience & Disciplines
  const [experienceLevel, setExperienceLevel] = useState("");
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  
  // Emergency Contacts
  const [vetContact, setVetContact] = useState("");
  const [farrierContact, setFarrierContact] = useState("");
  
  // Quick Facts
  const [selectedQuickFacts, setSelectedQuickFacts] = useState<string[]>([]);
  
  // Privacy
  const [isPublic, setIsPublic] = useState(true);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (breedDropdownRef.current && !breedDropdownRef.current.contains(event.target as Node)) {
        setShowBreedDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (horse) {
      // Populate form with existing horse data
      setName(horse.name || "");
      setPhotoUrl(horse.photo_url || "");
      setBreed(horse.breed || "");
      setBreedSearch(""); // Reset search when editing
      setDateOfBirth(horse.date_of_birth || "");
      setAge(horse.age?.toString() || "");
      setGender(horse.gender || "");
      setColorMarkings(horse.color_markings || "");
      setHeightHands(horse.height_hands?.toString() || "");
      setWeightKg(horse.weight_kg?.toString() || "");
      setDietaryRequirements(horse.dietary_requirements || "");
      setMedicalConditions(horse.medical_conditions || "");
      setCurrentMedications(horse.current_medications || "");
      setVaccinationDate(horse.vaccination_date || "");
      setPassportNumber(horse.passport_number || "");
      setTemperament(horse.temperament || "");
      setBehaviorNotes(horse.behavior_notes || "");
      setTurnoutPreferences(horse.turnout_preferences || "");
      setExperienceLevel(horse.experience_level || "");
      setSelectedDisciplines(horse.disciplines || []);
      setVetContact(horse.vet_contact || "");
      setFarrierContact(horse.farrier_contact || "");
      setSelectedQuickFacts(horse.quick_facts || []);
      setIsPublic(horse.public !== undefined ? horse.public : true);
    } else {
      // Reset form
      resetForm();
    }
  }, [horse, open]);

  const resetForm = () => {
    setName("");
    setPhotoUrl("");
    setBreed("");
    setBreedSearch("");
    setDateOfBirth("");
    setAge("");
    setGender("");
    setColorMarkings("");
    setHeightHands("");
    setWeightKg("");
    setDietaryRequirements("");
    setMedicalConditions("");
    setCurrentMedications("");
    setVaccinationDate("");
    setPassportNumber("");
    setTemperament("");
    setBehaviorNotes("");
    setTurnoutPreferences("");
    setExperienceLevel("");
    setSelectedDisciplines([]);
    setVetContact("");
    setFarrierContact("");
    setSelectedQuickFacts([]);
    setIsPublic(true);
  };

  const toggleDiscipline = (discipline: string) => {
    setSelectedDisciplines(prev =>
      prev.includes(discipline)
        ? prev.filter(d => d !== discipline)
        : [...prev, discipline]
    );
  };

  const toggleQuickFact = (fact: string) => {
    setSelectedQuickFacts(prev =>
      prev.includes(fact)
        ? prev.filter(f => f !== fact)
        : [...prev, fact]
    );
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file with comprehensive checks
    const { validateHorsePhotoUpload } = await import('@/lib/file-validation');
    const validation = validateHorsePhotoUpload(file);
    
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      // Clear the input
      event.target.value = '';
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('horse-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('horse-photos')
        .getPublicUrl(fileName);

      setPhotoUrl(publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const missingFields = [];
    if (!name) missingFields.push("Name");
    if (!breed) missingFields.push("Breed");
    if (!gender) missingFields.push("Gender");

    if (missingFields.length > 0) {
      toast.error(`Please fill in the following required fields: ${missingFields.join(", ")}`);
      return;
    }

    setLoading(true);

    try {
      const url = horse ? `/api/horses/${horse.id}` : "/api/horses";
      const method = horse ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          photo_url: photoUrl || null,
          breed,
          date_of_birth: dateOfBirth || null,
          age: age ? parseInt(age) : null,
          gender,
          color_markings: colorMarkings || null,
          height_hands: heightHands ? parseFloat(heightHands) : null,
          weight_kg: weightKg ? parseInt(weightKg) : null,
          dietary_requirements: dietaryRequirements || null,
          medical_conditions: medicalConditions || null,
          current_medications: currentMedications || null,
          vaccination_date: vaccinationDate || null,
          passport_number: passportNumber || null,
          temperament: temperament || null,
          behavior_notes: behaviorNotes || null,
          turnout_preferences: turnoutPreferences || null,
          experience_level: experienceLevel || null,
          disciplines: selectedDisciplines.length > 0 ? selectedDisciplines : null,
          vet_contact: vetContact || null,
          farrier_contact: farrierContact || null,
          quick_facts: selectedQuickFacts.length > 0 ? selectedQuickFacts : null,
          public: isPublic,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save horse");
      }

      toast.success(horse ? "Horse updated successfully" : "Horse added successfully");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredBreeds = filterBreeds(breedSearch);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{horse ? "Edit Horse" : "Add New Horse"}</DialogTitle>
          <DialogDescription>
            {horse ? "Update your horse's information" : "Add a new horse to your profile"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="health">Health</TabsTrigger>
              <TabsTrigger value="behavior">Behavior</TabsTrigger>
              <TabsTrigger value="experience">Experience</TabsTrigger>
            </TabsList>

            {/* BASIC INFO TAB */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Thunder"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="photo">Horse Photo</Label>
                  <div className="mt-2 space-y-3">
                    {photoUrl && (
                      <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted">
                        <img
                          src={photoUrl}
                          alt="Horse preview"
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => setPhotoUrl("")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={uploading}
                        onClick={() => document.getElementById('horse-photo-upload')?.click()}
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            {photoUrl ? "Change Photo" : "Upload Photo"}
                          </>
                        )}
                      </Button>
                      <input
                        id="horse-photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload a photo of your horse (max 5MB)
                    </p>
                  </div>
                </div>

                <div className="col-span-2 relative" ref={breedDropdownRef}>
                  <Label htmlFor="breed">Breed *</Label>
                  <Input
                    id="breed"
                    value={showBreedDropdown ? breedSearch : breed}
                    onChange={(e) => {
                      setBreedSearch(e.target.value);
                      setBreed(""); // Clear breed while searching
                      setShowBreedDropdown(true);
                    }}
                    onFocus={() => {
                      setBreedSearch(breed || "");
                      setShowBreedDropdown(true);
                    }}
                    placeholder="Type to search breed..."
                    autoComplete="off"
                  />
                  {showBreedDropdown && filteredBreeds.length > 0 && (
                    <div 
                      className="absolute w-full mt-1 border rounded-md shadow-lg max-h-[300px] overflow-y-auto"
                      style={{
                        zIndex: 9999,
                        backgroundColor: '#ffffff',
                        borderColor: '#d1d5db'
                      }}
                    >
                      {filteredBreeds.map((breedOption, index) => (
                        <div
                          key={`${breedOption}-${index}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setBreed(breedOption);
                            setBreedSearch("");
                            setShowBreedDropdown(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            color: 'rgb(0, 0, 0)',
                            backgroundColor: 'white',
                            fontSize: '14px',
                            fontWeight: 'normal',
                            textAlign: 'left',
                            width: '100%',
                            border: 'none',
                            outline: 'none',
                            opacity: '1',
                            pointerEvents: 'auto',
                            userSelect: 'none'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                            e.currentTarget.style.color = 'rgb(0, 0, 0)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.color = 'rgb(0, 0, 0)';
                          }}
                        >
                          {breedOption}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="age">Age (years)</Label>
                  <Input
                    id="age"
                    type="number"
                    min="0"
                    max="65"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Auto-calculated from DOB"
                  />
                </div>

                <div>
                  <Label htmlFor="gender">Gender *</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => (
                        <SelectItem key={g.value} value={g.value}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="height">Height (hands)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={heightHands}
                    onChange={(e) => setHeightHands(e.target.value)}
                    placeholder="e.g., 16.2"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="color">Color & Markings</Label>
                  <Input
                    id="color"
                    value={colorMarkings}
                    onChange={(e) => setColorMarkings(e.target.value)}
                    placeholder="e.g., Bay with white blaze and socks"
                  />
                </div>

                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="e.g., 500"
                  />
                </div>

                <div>
                  <Label htmlFor="passport">Passport/Microchip #</Label>
                  <Input
                    id="passport"
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value)}
                    placeholder="Optional"
                  />
                </div>

                <div className="col-span-2">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-0.5">
                      <Label htmlFor="public" className="text-base">Show on Public Profile</Label>
                      <p className="text-sm text-muted-foreground">
                        When enabled, this horse will appear on your public profile. 
                        Hosts can still see all your horses during bookings.
                      </p>
                    </div>
                    <Switch
                      id="public"
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* HEALTH TAB */}
            <TabsContent value="health" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="vaccination">Last Vaccination Date</Label>
                <Input
                  id="vaccination"
                  type="date"
                  value={vaccinationDate}
                  onChange={(e) => setVaccinationDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="dietary">Dietary Requirements</Label>
                <Textarea
                  id="dietary"
                  value={dietaryRequirements}
                  onChange={(e) => setDietaryRequirements(e.target.value)}
                  placeholder="e.g., Low sugar feed, No alfalfa"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="medical">Medical Conditions</Label>
                <Textarea
                  id="medical"
                  value={medicalConditions}
                  onChange={(e) => setMedicalConditions(e.target.value)}
                  placeholder="e.g., Cushings disease, Laminitis-prone"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="medications">Current Medications</Label>
                <Textarea
                  id="medications"
                  value={currentMedications}
                  onChange={(e) => setCurrentMedications(e.target.value)}
                  placeholder="List any medications and dosages"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="vet">Vet Contact</Label>
                <Input
                  id="vet"
                  value={vetContact}
                  onChange={(e) => setVetContact(e.target.value)}
                  placeholder="Vet name and phone number"
                />
              </div>

              <div>
                <Label htmlFor="farrier">Farrier Contact</Label>
                <Input
                  id="farrier"
                  value={farrierContact}
                  onChange={(e) => setFarrierContact(e.target.value)}
                  placeholder="Farrier name and phone number"
                />
              </div>
            </TabsContent>

            {/* BEHAVIOR TAB */}
            <TabsContent value="behavior" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="temperament">Temperament</Label>
                <Select value={temperament} onValueChange={setTemperament}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select temperament" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPERAMENTS.map((t) => (
                      <SelectItem key={t} value={t.toLowerCase()}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="behavior">Behavior Notes</Label>
                <Textarea
                  id="behavior"
                  value={behaviorNotes}
                  onChange={(e) => setBehaviorNotes(e.target.value)}
                  placeholder="e.g., Doesn't like other stallions, Needs quiet stabling"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="turnout">Turnout Preferences</Label>
                <Select value={turnoutPreferences} onValueChange={setTurnoutPreferences}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent>
                    {TURNOUT_PREFERENCES.map((t) => (
                      <SelectItem key={t} value={t.toLowerCase()}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Quick Facts</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select all that apply
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_FACTS.map((fact) => (
                    <Badge
                      key={fact}
                      variant={selectedQuickFacts.includes(fact) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleQuickFact(fact)}
                    >
                      {fact}
                      {selectedQuickFacts.includes(fact) && (
                        <X className="ml-1 h-3 w-3" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* EXPERIENCE TAB */}
            <TabsContent value="experience" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="experience">Experience Level</Label>
                <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((level) => (
                      <SelectItem key={level} value={level.toLowerCase().replace(/ /g, "-")}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Disciplines</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select all that apply
                </p>
                <div className="flex flex-wrap gap-2">
                  {DISCIPLINES.map((discipline) => (
                    <Badge
                      key={discipline}
                      variant={selectedDisciplines.includes(discipline) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleDiscipline(discipline)}
                    >
                      {discipline}
                      {selectedDisciplines.includes(discipline) && (
                        <X className="ml-1 h-3 w-3" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                horse ? "Update Horse" : "Add Horse"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

