import { cx } from "class-variance-authority";
import { headers } from "next/headers";

export default async function HeroVideo({
  className,
  ...props
}: React.VideoHTMLAttributes<HTMLVideoElement>) {
  const sources = {
    mp4: {
      source:
        "https://7v1rtc66rc.ufs.sh/f/RH0tqFYMim7sObRpCZr01qiY4ydXVIhgaprUeRfzoxQKA6Pw",
      type: "video/mp4",
    },
    webm: {
      source:
        "https://7v1rtc66rc.ufs.sh/f/RH0tqFYMim7sfD97QnLSALhE8WjGsTJ3tD5pofFgRxB2OUMb",
      type: "video/webm",
    },
  };

  const ua = (await headers()).get("user-agent") || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  return (
    <video className={cx("relative", className)} {...props}>
      <source
        src={isIOS ? sources.mp4.source : sources.webm.source}
        type={isIOS ? sources.mp4.type : sources.webm.type}
      />
    </video>
  );
}
