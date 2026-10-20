interface Props {
  // Its size and place, which differ between the profile and a dex.
  className: string;
  user: {
    donated: boolean;
  };
}

export function DonatedFlair({ className, user }: Props) {
  if (!user.donated) {
    return null;
  }

  return (
    <img
      alt="Donation Star"
      className={className}
      src="/emoji_star2.png"
      title="This user has donated!"
    />
  );
}
