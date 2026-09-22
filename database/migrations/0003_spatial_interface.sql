CREATE FUNCTION fieldops.make_point(longitude double precision, latitude double precision)
RETURNS public.geometry LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT public.ST_SetSRID(public.ST_MakePoint(longitude, latitude), 4326);
$$;

CREATE FUNCTION fieldops.longitude(point public.geometry)
RETURNS double precision LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT public.ST_X(point);
$$;

CREATE FUNCTION fieldops.latitude(point public.geometry)
RETURNS double precision LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT public.ST_Y(point);
$$;

REVOKE ALL ON FUNCTION fieldops.make_point(double precision, double precision),
  fieldops.longitude(public.geometry), fieldops.latitude(public.geometry) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fieldops.make_point(double precision, double precision),
  fieldops.longitude(public.geometry), fieldops.latitude(public.geometry) TO fieldops_api;
