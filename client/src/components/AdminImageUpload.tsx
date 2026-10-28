import { useState, type ChangeEvent } from "react";
import { ImagePlus, LoaderCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "../lib/trpc";

const MAX_BYTES = 4 * 1024 * 1024;
function fileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const data = result.slice(result.indexOf(",") + 1);
      data ? resolve(data) : reject(new Error("The image could not be read."));
    };
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.readAsDataURL(file);
  });
}

export default function AdminImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (stablePath: string) => void;
}) {
  const [fileName, setFileName] = useState("");
  const upload = trpc.admin.uploadProductImage.useMutation();
  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName("");
    try {
      if (file.size > MAX_BYTES) throw new Error("Choose an image under 4 MB.");
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw new Error("Use a JPEG, PNG or WebP image.");
      const result = await upload.mutateAsync({
        contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
        base64: await fileAsBase64(file),
      });
      onChange(result.imageUrl);
      setFileName(file.name);
      toast.success(
        "Your image is saved to the bakery’s secure media storage."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The image could not be uploaded."
      );
    } finally {
      event.target.value = "";
    }
  };
  return (
    <div className="admin-image-upload">
      <div className="admin-image-preview">
        {value ? (
          <img src={value} alt="Current cake image" />
        ) : (
          <ImagePlus size={23} />
        )}
      </div>
      <div className="admin-image-upload-copy">
        <span className="product-kicker">PRODUCT PHOTO · MAX 4 MB</span>
        <label
          className={`button button-outline button-small ${upload.isPending ? "upload-disabled" : ""}`}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={event => void selectFile(event)}
            disabled={upload.isPending}
          />
          {upload.isPending ? (
            <>
              <LoaderCircle size={14} className="spin" /> Uploading safely…
            </>
          ) : (
            <>
              <Upload size={14} /> {value ? "Replace image" : "Choose image"}
            </>
          )}
        </label>
        <small>
          {fileName ||
            "JPEG, PNG or WebP. The server checks the image before saving."}
        </small>
      </div>
    </div>
  );
}
