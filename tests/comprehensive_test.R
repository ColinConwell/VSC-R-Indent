# Comprehensive R Indentation Test Cases
# This file tests various R indentation scenarios that should be handled

# ============================================================================
# 1. BASIC BRACKET ALIGNMENT
# ============================================================================

# Function calls with multiple arguments
result <- my_function(arg1 = value1,
                      arg2 = value2,
                      arg3 = value3)

# Nested function calls
data <- data.frame(x = c(1, 2, 3),
                   y = c("a", "b", "c"),
                   z = factor(c("low", "med", "high")))

# List creation
my_list <- list(first = c(1, 2, 3),
                second = c("a", "b", "c"),
                third = data.frame(x = 1, y = 2))

# ============================================================================
# 2. PIPE OPERATORS
# ============================================================================

# Base R pipe |>
mtcars |>
  filter(mpg > 20) |>
  select(mpg, cyl, hp) |>
  arrange(desc(mpg))

# Magrittr pipe %>%
mtcars %>%
  filter(mpg > 20) %>%
  select(mpg, cyl, hp) %>%
  arrange(desc(mpg))

# Mixed pipes with function calls
data %>%
  group_by(category) %>%
  summarise(mean_value = mean(value,
                              na.rm = TRUE),
            count = n()) %>%
  filter(count > 5)

# ============================================================================
# 3. CONTROL FLOW STRUCTURES
# ============================================================================

# If-else statements
if (condition) {
  do_something()
  another_action()
} else if (other_condition) {
  alternative_action()
} else {
  default_action()
}

# For loops
for (i in 1:10) {
  result <- calculate(i)
  if (result > threshold) {
    important_results[[i]] <- result
  }
}

# While loops
while (condition) {
  update_values()
  check_convergence()
}

# ============================================================================
# 4. FUNCTION DEFINITIONS
# ============================================================================

# Simple function
my_function <- function(x, y) {
  result <- x + y
  return(result)
}

# Complex function with default arguments
complex_function <- function(data,
                            method = "default",
                            options = list(),
                            verbose = FALSE) {
  if (verbose) {
    message("Starting processing...")
  }
  
  processed <- switch(method,
                     "default" = default_process(data),
                     "advanced" = advanced_process(data, options),
                     stop("Unknown method"))
  
  return(processed)
}

# ============================================================================
# 5. NESTED STRUCTURES
# ============================================================================

# Nested lists and data structures
complex_structure <- list(
  metadata = list(
    version = "1.0",
    author = "developer@dev.com",
    created = Sys.Date()
  ),
  data = data.frame(
    id = 1:100,
    value = rnorm(100),
    category = sample(c("A", "B", "C"), 100, replace = TRUE)
  ),
  analysis = list(
    model = lm(value ~ category, data = data),
    summary = function() {
      summary(model)
    }
  )
)

# ============================================================================
# 6. GGPLOT AND VISUALIZATION
# ============================================================================

# ggplot with multiple layers
plot <- ggplot(data, aes(x = variable1, y = variable2)) +
  geom_point(aes(color = group),
             size = 3,
             alpha = 0.7) +
  geom_smooth(method = "lm",
              se = FALSE,
              color = "red") +
  facet_wrap(~category,
             scales = "free") +
  theme_minimal() +
  labs(title = "Scatter Plot Analysis",
       x = "Variable 1",
       y = "Variable 2",
       color = "Group")

# ============================================================================
# 7. EDGE CASES AND CHALLENGING SCENARIOS
# ============================================================================

# Comments mixed with code
result <- some_function(
  # This is the first argument
  arg1 = value1,
  # This is the second argument with a long comment
  arg2 = very_long_function_name(param1,
                                param2,
                                param3),
  # Final argument
  arg3 = value3
)

# Strings with special characters
text_processing <- function(input) {
  patterns <- c("\\s+",
                "\\d+",
                "[[:punct:]]")
  
  result <- str_replace_all(input,
                           patterns[1],
                           " ")
  return(result)
}

# Mixed bracket types
analysis_result <- lapply(data_list,
                         function(x) {
                           processed <- x[x$value > threshold, ]
                           summary_stats <- c(mean = mean(processed$value),
                                            sd = sd(processed$value),
                                            n = nrow(processed))
                           return(summary_stats)
                         })

# Assignment operators
value1 <- 100
value2 = 200
300 -> value3

# Multiple assignments on one line (should handle carefully)
a <- b <- c <- 0

# ============================================================================
# 8. TIDYVERSE SPECIFIC PATTERNS
# ============================================================================

# Dplyr chains with complex operations
result <- data %>%
  filter(!is.na(value)) %>%
  group_by(category, subcategory) %>%
  summarise(
    mean_val = mean(value),
    median_val = median(value),
    q75 = quantile(value, 0.75),
    .groups = "drop"
  ) %>%
  arrange(desc(mean_val)) %>%
  slice_head(n = 10)

# Tidyr operations
tidy_data <- wide_data %>%
  pivot_longer(cols = c(var1, var2, var3),
               names_to = "variable",
               values_to = "value") %>%
  separate(variable,
           into = c("type", "measurement"),
           sep = "_")
