import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { databases, DATABASE_ID, COLLECTIONS, storage, account } from "@/lib/appwriteClient";
import { ID } from "appwrite";
import { ArrowLeft, X, Camera } from "lucide-react";

const breeds = [
  "German Shepherd",
  "Boerboel", 
  "Rottweiler",
  "Labrador",
  "Mixed Breed",
  "Golden Retriever",
  "Bulldog",
  "Poodle",
  "Beagle",
  "Dachshund",
  "Siberian Husky",
  "Great Dane",
  "Doberman",
  "Shih Tzu",
  "Pomeranian",
  "Maltese",
  "Pug",
  "Boxer",
  "Cocker Spaniel",
  "Border Collie",
  "Chihuahua",
  "Yorkshire Terrier",
  "Boston Terrier",
  "French Bulldog",
  "Australian Shepherd",
  "Corgi",
  "Husky",
  "Malamute",
  "Samoyed",
  "Akita",
  "Other"
];

const genders = ["Male", "Female"];
const sizes = ["Small", "Medium", "Large", "Extra Large"];

export default function AddDog() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    breed: "",
    customBreed: "",
    ageYears: "",
    ageMonths: "",
    gender: "",
    size: "",
    color: "",
    weight: "",
    description: "",
    vaccinated: false,
    neutered: false,
    friendlyWith: "",
    location: "",
    isSearchable: true,
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState("");

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const uploadPhoto = async (file) => {
    try {
      setUploading(true);
      
      const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID || "images";
      
      const response = await storage.createFile(
        bucketId,
        ID.unique(),
        file
      );
      
      const fileUrl = storage.getFileView(
        bucketId,
        response.$id
      );
      
      return fileUrl;
    } catch (error) {
      console.error("Error uploading photo:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate required fields
    if (!formData.name || !formData.breed) {
      setError("Please fill in all required fields (Name, Breed)");
      setLoading(false);
      return;
    }

    // Validate age - at least one field should have a value
    if (!formData.ageYears && !formData.ageMonths) {
      setError("Please enter your dog's age (years and/or months)");
      setLoading(false);
      return;
    }

    // Validate age values are numbers
    if (formData.ageYears && (isNaN(formData.ageYears) || formData.ageYears < 0)) {
      setError("Please enter a valid number for years");
      setLoading(false);
      return;
    }

    if (formData.ageMonths && (isNaN(formData.ageMonths) || formData.ageMonths < 0 || formData.ageMonths > 11)) {
      setError("Months must be between 0 and 11");
      setLoading(false);
      return;
    }

    // If breed is "Mixed Breed" or "Other" and custom breed is empty
    if ((formData.breed === "Mixed Breed" || formData.breed === "Other") && !formData.customBreed.trim()) {
      setError(`Please specify your dog's ${formData.breed === "Mixed Breed" ? "mix" : "breed"}`);
      setLoading(false);
      return;
    }

    try {
      const currentUser = await account.get();
      
      let photoUrl = null;
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile);
      }

      // Determine the breed to save
      let finalBreed = formData.breed;
      if (formData.breed === "Mixed Breed" || formData.breed === "Other") {
        finalBreed = formData.customBreed.trim();
      }

      // Parse age values
      const years = parseInt(formData.ageYears) || 0;
      const months = parseInt(formData.ageMonths) || 0;

      // Handle weight - convert to integer (round to nearest whole number)
      let weightValue = 0;
      if (formData.weight) {
        const parsedWeight = parseFloat(formData.weight);
        if (!isNaN(parsedWeight)) {
          weightValue = Math.round(parsedWeight); // Round to nearest integer
        }
      }

      // Create dog data with correct data types
      const dogData = {
        ownerId: currentUser.$id,
        name: formData.name,
        species: "Dog",
        breed: finalBreed,
        size: formData.size || "",
        ageYears: years,
        photoUrl: photoUrl || "",
        bio: formData.description || "",
        location: formData.location || "",
        isSearchable: formData.isSearchable,
        AgeMonths: months,
        gender: formData.gender || "",
        color: formData.color || "",
        weight: weightValue, // Now always an integer
        vaccinated: formData.vaccinated,
        neutered: formData.neutered,
        friendlyWith: formData.friendlyWith || "",
      };

      console.log("Sending dog data:", dogData);

      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PETS,
        ID.unique(),
        dogData
      );

      console.log("Dog created:", response);
      navigate("/profile");
    } catch (error) {
      console.error("Error creating dog:", error);
      setError(error.message || "Failed to add dog. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Check if custom breed input should be shown
  const showCustomBreed = formData.breed === "Mixed Breed" || formData.breed === "Other";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-[430px] mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-jakarta font-bold text-lg text-foreground">Add New Dog</h1>
        </div>
      </div>

      <div className="max-w-[430px] mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photo Upload */}
          <div className="flex flex-col items-center">
            <div className="relative">
              {photoPreview ? (
                <div className="relative">
                  <img 
                    src={photoPreview} 
                    alt="Dog preview" 
                    className="w-32 h-32 rounded-full object-cover border-2 border-primary"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-32 h-32 rounded-full border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors bg-muted/30">
                  <Camera className="w-8 h-8 text-muted-foreground mb-1" />
                  <span className="text-[10px] font-jakarta text-muted-foreground">Add Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-[11px] font-jakarta text-muted-foreground mt-2">
              Upload a photo of your dog (optional)
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-jakarta font-semibold text-foreground mb-1.5">
              Dog Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your dog's name"
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>

          {/* Breed */}
          <div>
            <label className="block text-sm font-jakarta font-semibold text-foreground mb-1.5">
              Breed <span className="text-red-500">*</span>
            </label>
            <select
              name="breed"
              value={formData.breed}
              onChange={handleInputChange}
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm font-jakarta text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            >
              <option value="">Select breed</option>
              {breeds.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Custom Breed Input */}
          {showCustomBreed && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-jakarta font-semibold text-foreground mb-1.5">
                {formData.breed === "Mixed Breed" ? "Specify Mixed Breed" : "Specify Breed"} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="customBreed"
                value={formData.customBreed}
                onChange={handleInputChange}
                placeholder={
                  formData.breed === "Mixed Breed" 
                    ? "e.g., Maltese Poodle Mix, Labradoodle, Golden Retriever Mix"
                    : "e.g., Maltipoo, Labradoodle, Cockapoo"
                }
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
              <p className="text-xs font-jakarta text-muted-foreground mt-1.5">
                {formData.breed === "Mixed Breed" 
                  ? "💡 Enter the mix of breeds (e.g., 'Maltese Poodle Mix' or 'Labrador Golden Retriever Mix')"
                  : "💡 Enter the specific breed name (e.g., 'Maltipoo', 'Labradoodle', 'Cockapoo')"
                }
              </p>
            </div>
          )}

          {/* Age - Years and Months */}
          <div>
            <label className="block text-sm font-jakarta font-semibold text-foreground mb-1.5">
              Age <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-jakarta text-muted-foreground mb-1">
                  Years
                </label>
                <input
                  type="number"
                  name="ageYears"
                  value={formData.ageYears}
                  onChange={handleInputChange}
                  placeholder="e.g., 2"
                  min="0"
                  max="30"
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-jakarta text-muted-foreground mb-1">
                  Months
                </label>
                <input
                  type="number"
                  name="ageMonths"
                  value={formData.ageMonths}
                  onChange={handleInputChange}
                  placeholder="e.g., 6"
                  min="0"
                  max="11"
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <p className="text-xs font-jakarta text-muted-foreground mt-1.5">
              💡 Enter years and/or months (e.g., 2 years 6 months, or just 6 months)
            </p>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-jakarta font-semibold text-foreground mb-1.5">
              Gender
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm font-jakarta text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select gender</option>
              {genders.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Size */}
          <div>
            <label className="block text-sm font-jakarta font-semibold text-foreground mb-1.5">
              Size
            </label>
            <select
              name="size"
              value={formData.size}
              onChange={handleInputChange}
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm font-jakarta text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select size</option>
              {sizes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-jakarta font-semibold text-foreground mb-1.5">
              Color
            </label>
            <input
              type="text"
              name="color"
              value={formData.color}
              onChange={handleInputChange}
              placeholder="e.g., Brown, Black, White"
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Weight - Integer only */}
          <div>
            <label className="block text-sm font-jakarta font-semibold text-foreground mb-1.5">
              Weight (kg)
            </label>
            <input
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleInputChange}
              placeholder="e.g., 15"
              min="0"
              step="1" // Only whole numbers
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs font-jakarta text-muted-foreground mt-1.5">
              💡 Enter weight in whole kilograms (e.g., 8, 15, 20)
            </p>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-jakarta font-semibold text-foreground mb-1.5">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g., Accra, Kumasi"
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Description/Bio */}
          <div>
            <label className="block text-sm font-jakarta font-semibold text-foreground mb-1.5">
              Bio / Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Tell us about your dog's personality, habits, etc."
              rows="3"
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Friendly With */}
          <div>
            <label className="block text-sm font-jakarta font-semibold text-foreground mb-1.5">
              Friendly With
            </label>
            <input
              type="text"
              name="friendlyWith"
              value={formData.friendlyWith}
              onChange={handleInputChange}
              placeholder="e.g., Dogs, Cats, Children"
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="vaccinated"
                checked={formData.vaccinated}
                onChange={handleInputChange}
                className="w-4 h-4 text-primary rounded focus:ring-primary/30"
              />
              <span className="text-sm font-jakarta text-foreground">Vaccinated</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="neutered"
                checked={formData.neutered}
                onChange={handleInputChange}
                className="w-4 h-4 text-primary rounded focus:ring-primary/30"
              />
              <span className="text-sm font-jakarta text-foreground">Neutered/Spayed</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isSearchable"
                checked={formData.isSearchable}
                onChange={handleInputChange}
                className="w-4 h-4 text-primary rounded focus:ring-primary/30"
              />
              <span className="text-sm font-jakarta text-foreground">Make my dog searchable for playdates</span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-sm font-jakarta text-red-500">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || uploading}
            className="w-full bg-primary text-white rounded-xl py-3.5 font-jakarta font-semibold text-sm active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || uploading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                {uploading ? "Uploading Photo..." : "Adding Dog..."}
              </div>
            ) : (
              "Add Dog"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}