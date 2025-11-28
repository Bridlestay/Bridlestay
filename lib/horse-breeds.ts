// Comprehensive list of horse breeds
export const HORSE_BREEDS = [
  // Popular breeds (top of list)
  "Thoroughbred",
  "Quarter Horse",
  "Arabian",
  "Warmblood",
  "Paint Horse",
  "Appaloosa",
  "Morgan",
  "Tennessee Walking Horse",
  "Standardbred",
  "Mustang",
  
  // European breeds
  "Andalusian",
  "Belgian",
  "Clydesdale",
  "Dutch Warmblood",
  "Friesian",
  "Hanoverian",
  "Holstein",
  "Irish Draught",
  "Lipizzaner",
  "Lusitano",
  "Oldenburg",
  "Percheron",
  "Selle Français",
  "Shire",
  "Trakehner",
  "Westphalian",
  
  // British & Irish breeds
  "Connemara",
  "Dales Pony",
  "Dartmoor Pony",
  "Exmoor Pony",
  "Fell Pony",
  "Highland Pony",
  "New Forest Pony",
  "Shetland Pony",
  "Welsh Cob",
  "Welsh Pony",
  
  // American breeds
  "American Saddlebred",
  "Missouri Fox Trotter",
  "Palomino",
  "Pinto",
  "Rocky Mountain Horse",
  
  // Sport breeds
  "Anglo-Arabian",
  "Cleveland Bay",
  "Hackney",
  "Irish Sport Horse",
  "Swedish Warmblood",
  
  // Draft breeds
  "American Cream Draft",
  "Ardennes",
  "Breton",
  "Comtois",
  "Drum Horse",
  "Gypsy Vanner",
  "Haflinger",
  "Norwegian Fjord",
  "Suffolk Punch",
  
  // Ponies
  "Chincoteague Pony",
  "Icelandic Horse",
  "Pony of the Americas",
  "Quarter Pony",
  
  // Spanish & Portuguese
  "Criollo",
  "Mangalarga Marchador",
  "Paso Fino",
  "Peruvian Paso",
  
  // Eastern & Middle Eastern
  "Akhal-Teke",
  "Barb",
  "Caspian",
  "Marwari",
  
  // Other popular breeds
  "Buckskin",
  "Cremello",
  "Dun",
  "Grulla",
  "Roan",
  
  // Crosses
  "Appendix Quarter Horse",
  "Azteca",
  "National Show Horse",
  "Warlander",
  
  // Other
  "Other/Mixed Breed",
];

// Common temperament options
export const TEMPERAMENTS = [
  "Calm",
  "Friendly",
  "Energetic",
  "Nervous",
  "Spooky",
  "Sensitive",
  "Bold",
  "Lazy",
  "Hot-blooded",
  "Cold-blooded",
];

// Experience levels
export const EXPERIENCE_LEVELS = [
  "Beginner-Safe",
  "Intermediate",
  "Advanced",
  "Experienced Riders Only",
];

// Disciplines
export const DISCIPLINES = [
  "Dressage",
  "Show Jumping",
  "Eventing",
  "Cross Country",
  "Trail Riding",
  "Pleasure Riding",
  "Western Pleasure",
  "Reining",
  "Barrel Racing",
  "Cutting",
  "Endurance",
  "Hunter",
  "Polo",
  "Vaulting",
  "Driving",
  "Liberty",
  "Natural Horsemanship",
  "Ranch Work",
  "English Riding",
  "Western Riding",
];

// Turnout preferences
export const TURNOUT_PREFERENCES = [
  "Individual Turnout",
  "Group Turnout",
  "Prefers Mares",
  "Prefers Geldings",
  "Can be with Stallions",
  "Needs Quiet Companions",
  "Very Social",
  "Requires Separation",
];

// Quick facts options
export const QUICK_FACTS = [
  "Family Safe",
  "Beginner Friendly",
  "Kid Safe",
  "Competition Horse",
  "Special Needs",
  "Senior Horse",
  "Young Horse",
  "In Training",
  "Therapy Horse",
  "Breeding",
  "Retired",
  "High Energy",
  "Easy Keeper",
  "Hard Keeper",
];

// Gender options
export const GENDERS = [
  { value: "mare", label: "Mare" },
  { value: "gelding", label: "Gelding" },
  { value: "stallion", label: "Stallion" },
];

// Function to filter breeds based on user input
export function filterBreeds(searchTerm: string): string[] {
  if (!searchTerm) return HORSE_BREEDS;
  
  const lowerSearch = searchTerm.toLowerCase();
  return HORSE_BREEDS.filter(breed => 
    breed.toLowerCase().includes(lowerSearch)
  ).slice(0, 10); // Limit to top 10 matches
}

