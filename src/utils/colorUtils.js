export const setDynamicColors = () => {
  const schoolId = localStorage.getItem("schoolId");
  const primaryOrange = schoolId === "1" ? "#f0a150" : "#CD7F32";
  
  // Set the CSS custom property on the document root
  document.documentElement.style.setProperty('--color-primary-orange', primaryOrange);
};
