"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function NewListingPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState<string>("all");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [phone, setPhone] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories(data || []);
    if (data && data.length > 0) setCategoryId(data[0].id);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setImageFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(String(reader.result));
      reader.readAsDataURL(f);
    } else {
      setImagePreview(null);
    }
  };

  const validate = () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return false;
    }
    if (!description.trim()) {
      toast.error("Description is required");
      return false;
    }
    const p = parseFloat(price);
    if (Number.isNaN(p) || p <= 0) {
      toast.error("Price must be a positive number");
      return false;
    }
    if (phone && !/^2547\d{8}$/.test(phone)) {
      toast.error("Phone must be in 2547XXXXXXXX format");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validate()) return;

  setLoading(true);
  let createdListing: any = null;
  try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be signed in to create a listing");
        router.push("/auth/login");
        setLoading(false);
        return;
      }

      const insertPayload: any = {
        owner: user.id,
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId === "all" ? null : categoryId,
        price: parseFloat(price),
        status: "active",
        location: location || null,
        contact_phone: phone || null,
      };

      // Insert listing
      const res = await supabase
        .from('listings')
        .insert(insertPayload)
        .select()
        .maybeSingle();

      createdListing = (res as any).data;
      const insertErr = (res as any).error;

      if (insertErr || !createdListing) {
        // Log the detailed database error for server-side diagnostics, but show a generic error to users
        console.error('Listing insert error:', insertErr);
        toast.error('Failed to create listing. Please try again or contact support.');
        setLoading(false);
        return;
      }

      // Optional image: upload to storage and save to listing_images table
      if (imageFile) {
        try {
          const filePath = `listings/${user.id}/${createdListing.id}/${Date.now()}-${imageFile.name}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from("listing-images")
            .upload(filePath, imageFile, { cacheControl: "3600", upsert: false });

          if (uploadErr) {
            console.warn("Image upload error", uploadErr);
          } else if (uploadData?.path) {
            await supabase.from("listing_images").insert({
              listing_id: createdListing.id,
              storage_path: uploadData.path,
              alt_text: title.trim(),
            });
          }
        } catch (err) {
          console.error("Image upload failed", err);
        }
      }

      toast.success("Listing created successfully!");
      router.push("/dashboard/seller");
    } catch (err: any) {
      console.error('Unhandled error creating listing:', err);
      toast.error('An unexpected error occurred while creating the listing. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Listing</CardTitle>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. iPhone 13 - Good condition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm bg-transparent"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your item or service"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Select value={categoryId} onValueChange={(v) => setCategoryId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Uncategorized</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Price (KES)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Contact Phone (optional)</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="2547XXXXXXXX"
              />
              <p className="text-xs text-muted-foreground mt-1">Provide a phone number buyers can reach you on (optional)</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Location (optional)</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, County or area"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Image (optional)</label>
              <input type="file" accept="image/*" onChange={onFileChange} />
              {imagePreview && (
                <div className="mt-2">
                  <img src={imagePreview} alt="Preview" className="w-full max-w-lg rounded-md border object-cover" style={{ aspectRatio: '4 / 3' }} />
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">You can upload one image now and add more later.</p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creating..." : "Create Listing"}
              </Button>
            </div>
            <div className="flex-1">
              <Button variant="ghost" onClick={() => router.push("/dashboard/seller")} className="w-full">
                Cancel
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}