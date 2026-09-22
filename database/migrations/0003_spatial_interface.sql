CREATE FUNCTION fieldmaps.make_point(longitude double precision, latitude double precision)
RETURNS public.geometry LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT public.ST_SetSRID(public.ST_MakePoint(longitude, latitude), 4326);
$$;

CREATE FUNCTION fieldmaps.longitude(point public.geometry)
RETURNS double precision LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT public.ST_X(point);
$$;

CREATE FUNCTION fieldmaps.latitude(point public.geometry)
RETURNS double precision LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT public.ST_Y(point);
$$;

REVOKE ALL ON FUNCTION fieldmaps.make_point(double precision, double precision),
  fieldmaps.longitude(public.geometry), fieldmaps.latitude(public.geometry) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fieldmaps.make_point(double precision, double precision),
  fieldmaps.longitude(public.geometry), fieldmaps.latitude(public.geometry) TO fieldmaps_api;
