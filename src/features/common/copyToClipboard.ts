import toast from "react-hot-toast";

type copyToClipboardProps = {
  text: string;
};

export default function copyToClipboard ({text}: copyToClipboardProps) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      toast.success("CID copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy CID:", err);
      toast.error("Failed to copy CID.");
    });
};