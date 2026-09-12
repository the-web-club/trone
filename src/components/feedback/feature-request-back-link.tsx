"use client";

import { useEffect, useState } from "react";
import { DetailBackLink } from "@/components/detail/detail-layout";
import { FEATURE_REQUEST_LIST_HREF_KEY } from "@/lib/feature-request-query";
import { featureRequestListPath } from "@/lib/paths";

export function FeatureRequestBackLink() {
  const [href, setHref] = useState(featureRequestListPath());

  useEffect(() => {
    const stored = sessionStorage.getItem(FEATURE_REQUEST_LIST_HREF_KEY);
    if (stored?.startsWith(featureRequestListPath())) {
      setHref(stored);
    }
  }, []);

  return <DetailBackLink href={href}>Feedback</DetailBackLink>;
}
