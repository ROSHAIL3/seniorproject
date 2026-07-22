import Image from "next/image";
import AvatarText from "@/components/ui/avatar/AvatarText";

export default function CustomerAvatar({
  name,
  photoUrl,
  className = "size-16",
}: {
  name: string;
  photoUrl?: string;
  className?: string;
}) {
  return photoUrl ? (
    <div className={`relative overflow-hidden rounded-full ${className}`}>
      <Image
        src={photoUrl}
        alt={`${name} profile`}
        fill
        unoptimized
        className="object-cover"
      />
    </div>
  ) : (
    <AvatarText name={name} className={className} />
  );
}
