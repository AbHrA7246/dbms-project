#!/usr/bin/env Rscript
# ==============================================================================
# EcoCycle — Statistical E-Waste Analytics Pipeline
# Base R implementation for operational audit, discrepancy analysis, and capacity modeling
# ==============================================================================

# Parse command line arguments
args <- commandArgs(trailingOnly = TRUE)
input_csv <- if (length(args) > 0) args[1] else "ecocycle_analytics_data.csv"
output_report <- if (length(args) > 1) args[2] else NULL

cat("==============================================================================\n")
cat(" EcoCycle — Statistical E-Waste Operational & Capacity Audit Report\n")
cat(" Generated on:", format(Sys.time(), "%Y-%m-%d %H:%M:%S %Z"), "\n")
cat(" Target Dataset:", input_csv, "\n")
cat("==============================================================================\n\n")

# Check file existence
if (!file.exists(input_csv)) {
  cat("[INFO] Target dataset file not found:", input_csv, "\n\n")
  cat("To generate an operational dataset from EcoCycle:\n")
  cat("  1. Log into the EcoCycle Recycling Centre Portal (/centre/login).\n")
  cat("  2. On the Facility Dashboard, click 'Export for R Analytics'.\n")
  cat("  3. Place the downloaded CSV file in the project folder or specify its path:\n")
  cat("     Rscript analytics/initial_analysis.R path/to/dataset.csv\n\n")
  cat("Exiting gracefully.\n")
  quit(status = 0)
}

# Read CSV data safely
data <- tryCatch({
  read.csv(input_csv, stringsAsFactors = FALSE, check.names = FALSE)
}, error = function(e) {
  cat("[ERROR] Failed to parse CSV file:", e$message, "\n")
  quit(status = 1)
})

# Check if empty dataset
if (nrow(data) == 0) {
  cat("[INFO] Dataset contains 0 declarations (header-only file).\n")
  cat("No statistical computations can be performed on an empty declaration log.\n")
  cat("Submit e-waste declarations via the customer portal to populate metrics.\n\n")
  quit(status = 0)
}

# Helper formatting functions
fmt_pct <- function(val, total) {
  if (total <= 0) return("0.0%")
  sprintf("%5.1f%%", (val / total) * 100)
}

fmt_kg <- function(val) {
  sprintf("%.2f kg", ifelse(is.na(val), 0, val))
}

# ------------------------------------------------------------------------------
# 1. Dataset Overview & Data Quality Audit
# ------------------------------------------------------------------------------
cat("------------------------------------------------------------------------------\n")
cat(" 1. DATASET OVERVIEW & DATA INTEGRITY AUDIT\n")
cat("------------------------------------------------------------------------------\n")
total_records <- nrow(data)
cat(sprintf("Total Declarations Analyzed: %d\n\n", total_records))

# Status group breakdown
cat("Operational Status Distribution:\n")
status_col <- if ("status_group" %in% names(data)) data$status_group else data$status
status_counts <- table(status_col)
for (st in names(status_counts)) {
  count <- as.numeric(status_counts[st])
  cat(sprintf("  • %-15s : %4d records (%s)\n", st, count, fmt_pct(count, total_records)))
}
cat("\n")

# Geocoding coverage
cat("Geographic Geocoding Coverage:\n")
has_coords <- rep(FALSE, total_records)
if ("has_coordinates" %in% names(data)) {
  has_coords <- toupper(trimws(as.character(data$has_coordinates))) %in% c("TRUE", "1", "YES", "T")
} else if ("latitude" %in% names(data) && "longitude" %in% names(data)) {
  has_coords <- !is.na(as.numeric(data$latitude)) & !is.na(as.numeric(data$longitude))
}
geocoded_count <- sum(has_coords)
cat(sprintf("  • Geocoded Records (Geoapify) : %4d / %d (%s)\n", 
            geocoded_count, total_records, fmt_pct(geocoded_count, total_records)))
cat(sprintf("  • Unverified / Manual Records: %4d / %d (%s)\n\n", 
            total_records - geocoded_count, total_records, fmt_pct(total_records - geocoded_count, total_records)))

# Weight integrity
decl_weights <- as.numeric(data$declared_weight_kg)
decl_weights <- decl_weights[!is.na(decl_weights)]
cat("Declared Mass Summary:\n")
if (length(decl_weights) > 0) {
  cat(sprintf("  • Total Declared Mass : %s\n", fmt_kg(sum(decl_weights))))
  cat(sprintf("  • Mean Declaration    : %s (Std Dev: %.2f kg)\n", fmt_kg(mean(decl_weights)), ifelse(length(decl_weights) > 1, sd(decl_weights), 0)))
  cat(sprintf("  • Median Declaration  : %s\n", fmt_kg(median(decl_weights))))
  cat(sprintf("  • Range (Min / Max)   : %s / %s\n", fmt_kg(min(decl_weights)), fmt_kg(max(decl_weights))))
} else {
  cat("  • No numeric weights recorded.\n")
}
cat("\n")

# ------------------------------------------------------------------------------
# 2. Volume & Composition by Waste Category
# ------------------------------------------------------------------------------
cat("------------------------------------------------------------------------------\n")
cat(" 2. HARDWARE CATEGORY BREAKDOWN\n")
cat("------------------------------------------------------------------------------\n")
if ("category" %in% names(data)) {
  categories <- unique(data$category)
  total_mass <- sum(decl_weights)
  
  cat(sprintf("%-28s %8s %12s %16s %10s\n", "Category", "Records", "Total Units", "Declared Mass", "Share"))
  cat(paste(rep("-", 78), collapse = ""), "\n")
  
  for (cat_name in sort(categories)) {
    sub <- data[data$category == cat_name, ]
    n_rec <- nrow(sub)
    units <- sum(as.numeric(sub$quantity), na.rm = TRUE)
    mass <- sum(as.numeric(sub$declared_weight_kg), na.rm = TRUE)
    share_pct <- fmt_pct(mass, total_mass)
    cat(sprintf("%-28s %8d %12d %16s %10s\n", 
                cat_name, n_rec, units, fmt_kg(mass), share_pct))
  }
} else {
  cat("[WARN] 'category' column not found in dataset.\n")
}
cat("\n")

# ------------------------------------------------------------------------------
# 3. Intake Discrepancy Analysis (Declared vs Received Mass)
# ------------------------------------------------------------------------------
cat("------------------------------------------------------------------------------\n")
cat(" 3. PHYSICAL INTAKE DISCREPANCY ANALYSIS (Declared vs Received)\n")
cat("------------------------------------------------------------------------------\n")

has_received_col <- "received_weight_kg" %in% names(data)
if (has_received_col) {
  rec_wt <- as.numeric(data$received_weight_kg)
  valid_intake <- !is.na(rec_wt) & rec_wt > 0
  intake_sub <- data[valid_intake, ]
  
  if (nrow(intake_sub) > 0) {
    intake_decl <- as.numeric(intake_sub$declared_weight_kg)
    intake_rec <- as.numeric(intake_sub$received_weight_kg)
    diffs <- intake_rec - intake_decl
    pct_diffs <- ifelse(intake_decl > 0, (diffs / intake_decl) * 100, 0)
    
    cat(sprintf("Physical Intake Records Audited : %d declarations\n", nrow(intake_sub)))
    cat(sprintf("  • Total Customer Declared Mass: %s\n", fmt_kg(sum(intake_decl))))
    cat(sprintf("  • Total Verified Intake Mass  : %s\n", fmt_kg(sum(intake_rec))))
    cat(sprintf("  • Net Discrepancy             : %+s (%.2f%% net deviation)\n", 
                fmt_kg(sum(diffs)), 
                ifelse(sum(intake_decl) > 0, (sum(diffs) / sum(intake_decl)) * 100, 0)))
    cat(sprintf("  • Mean Discrepancy per Item   : %+s (Std Dev: %.2f kg)\n", 
                fmt_kg(mean(diffs)), ifelse(length(diffs) > 1, sd(diffs), 0)))
    cat(sprintf("  • Median Discrepancy          : %+s\n", fmt_kg(median(diffs))))
    cat(sprintf("  • Max Under-declaration       : %+s\n", fmt_kg(max(diffs))))
    cat(sprintf("  • Max Over-declaration        : %+s\n", fmt_kg(min(diffs))))
    
    # Check if discrepancy is statistically significant (paired t-test if N >= 5)
    if (nrow(intake_sub) >= 5 && length(unique(diffs)) > 1) {
      ttest_res <- t.test(intake_rec, intake_decl, paired = TRUE)
      cat(sprintf("  • Paired t-test p-value       : %.4f (%s)\n", 
                  ttest_res$p.value,
                  ifelse(ttest_res$p.value < 0.05, 
                         "Significant systematic deviation detected", 
                         "No statistically significant systematic bias")))
    }
  } else {
    cat("[INFO] No verified physical intake records found in dataset.\n")
    cat("Complete collection intakes in Centre Requests to record received weights.\n")
  }
} else {
  cat("[WARN] 'received_weight_kg' column not found in dataset.\n")
}
cat("\n")

# ------------------------------------------------------------------------------
# 4. Operational Channel & Workload Distribution
# ------------------------------------------------------------------------------
cat("------------------------------------------------------------------------------\n")
cat(" 4. COLLECTION CHANNEL & FACILITY DISTRIBUTION\n")
cat("------------------------------------------------------------------------------\n")

if ("method" %in% names(data)) {
  methods <- table(data$method)
  cat("Collection Methods:\n")
  for (m in names(methods)) {
    cnt <- as.numeric(methods[m])
    cat(sprintf("  • %-20s: %4d records (%s)\n", 
                ifelse(m == "pickup", "Doorstep Courier", "Depot Drop-off"),
                cnt, fmt_pct(cnt, total_records)))
  }
  cat("\n")
}

if ("centre_name" %in% names(data) || "centre_id" %in% names(data)) {
  centre_col <- if ("centre_name" %in% names(data)) data$centre_name else data$centre_id
  centre_col[centre_col == "" | is.na(centre_col)] <- "Unassigned"
  centres <- table(centre_col)
  
  cat("Intake by Recycling Facility:\n")
  for (c_name in names(centres)) {
    cnt <- as.numeric(centres[c_name])
    c_sub <- data[centre_col == c_name, ]
    c_mass <- sum(as.numeric(c_sub$declared_weight_kg), na.rm = TRUE)
    cat(sprintf("  • %-32s: %4d dispatches | %s\n", 
                substr(c_name, 1, 32), cnt, fmt_kg(c_mass)))
  }
}
cat("\n")

cat("==============================================================================\n")
cat(" End of EcoCycle Statistical Report\n")
cat("==============================================================================\n")
