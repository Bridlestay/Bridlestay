/**
 * List of UK counties available for BridleStay properties
 * Currently limited to launch regions - will expand to more counties soon!
 * 
 * Launch Counties (Phase 1):
 * - Gloucestershire
 * - Herefordshire  
 * - Shropshire
 * - Worcestershire
 */
export const UK_COUNTIES = [
  "Gloucestershire",
  "Herefordshire",
  "Shropshire",
  "Worcestershire",
];

/**
 * Future expansion counties (coming soon):
 * Berkshire, Buckinghamshire, Cambridgeshire, Cheshire, Cornwall, Cumbria,
 * Derbyshire, Devon, Dorset, Durham, East Sussex, Essex, Hampshire, Hertfordshire,
 * Kent, Lancashire, Leicestershire, Lincolnshire, Norfolk, North Yorkshire,
 * Northamptonshire, Northumberland, Nottinghamshire, Oxfordshire, Rutland,
 * Shropshire, Somerset, South Yorkshire, Staffordshire, Suffolk, Surrey,
 * Warwickshire, West Sussex, West Yorkshire, Wiltshire
 */

export type UKCounty = typeof UK_COUNTIES[number];

