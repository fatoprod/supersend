import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import type {
  GenerateTemplateFromUrlRequest,
  GenerateTemplateFromUrlResponse,
} from "../../types";

const callable = httpsCallable<
  GenerateTemplateFromUrlRequest,
  GenerateTemplateFromUrlResponse
>(functions, "generateTemplateFromUrl");

export async function generateTemplateFromUrl(
  url: string
): Promise<GenerateTemplateFromUrlResponse> {
  const res = await callable({ url });
  return res.data;
}
