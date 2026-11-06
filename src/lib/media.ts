import asset0 from "@/assets/dr-01.asset.json";
import asset1 from "@/assets/dr-02.asset.json";
import asset2 from "@/assets/dr-03.asset.json";
import asset3 from "@/assets/dr-04.asset.json";
import asset4 from "@/assets/dr-05.asset.json";
import asset5 from "@/assets/dr-06.asset.json";
import asset6 from "@/assets/dr-07.asset.json";
import asset7 from "@/assets/dr-08.asset.json";
import asset8 from "@/assets/dr-09.asset.json";
import asset9 from "@/assets/dr-10.asset.json";
import asset10 from "@/assets/cervical-lateral.asset.json";
import asset11 from "@/assets/chest-pa.asset.json";
import asset12 from "@/assets/hand-pa.asset.json";
import asset13 from "@/assets/knee-lateral.asset.json";
const media: Record<string,string> = {
  "/images/doctors/dr-01.jpg": asset0.url,
  "/images/doctors/dr-02.jpg": asset1.url,
  "/images/doctors/dr-03.jpg": asset2.url,
  "/images/doctors/dr-04.jpg": asset3.url,
  "/images/doctors/dr-05.jpg": asset4.url,
  "/images/doctors/dr-06.jpg": asset5.url,
  "/images/doctors/dr-07.jpg": asset6.url,
  "/images/doctors/dr-08.jpg": asset7.url,
  "/images/doctors/dr-09.jpg": asset8.url,
  "/images/doctors/dr-10.jpg": asset9.url,
  "/images/xray/cervical-lateral.jpg": asset10.url,
  "/images/xray/chest-pa.jpg": asset11.url,
  "/images/xray/hand-pa.jpg": asset12.url,
  "/images/xray/knee-lateral.jpg": asset13.url,
};
export function resolveMedia(src: string) { return media[src] ?? src; }
