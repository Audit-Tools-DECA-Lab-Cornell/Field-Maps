import { useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { ObservationForm } from "../src/components/observation-form";
import { ScreenMessage } from "../src/components/screen-message";
import { coordinateSchema } from "../src/domain/observation";

const locationParams = z
  .object({
    longitude: z.string().min(1).transform(Number),
    latitude: z.string().min(1).transform(Number),
  })
  .transform(({ longitude, latitude }) => [longitude, latitude])
  .pipe(coordinateSchema);

export default function ObserveScreen() {
  const params = useLocalSearchParams();
  const parsed = locationParams.safeParse(params);
  if (!parsed.success) {
    return (
      <ScreenMessage
        title="Choose a location first"
        detail="Return to the site map and tap where you want to add an observation."
      />
    );
  }
  return <ObservationForm coordinates={parsed.data} />;
}
